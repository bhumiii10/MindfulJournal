import { handleChat, toHttpsError, type ChatDeps } from './chat';
import { GEMINI_ENDPOINT } from './gemini';
import { UpstreamError } from './retry';
import { MemoryRateLimiter, MemoryRequestStore } from './stores/memory';
import { PENDING_STALE_MS, RATE_MAX_PER_WINDOW } from './stores/types';

type FakeReply = { status: number; body?: unknown; headers?: Record<string, string> };

/** A scripted stand-in for fetch: each call consumes the next reply (the last one repeats). */
function fakeFetch(replies: Array<FakeReply | Error>) {
  let i = 0;
  const fn = jest.fn(async (_url: unknown, _init?: unknown) => {
    const next = replies[Math.min(i++, replies.length - 1)];
    if (next instanceof Error) throw next;
    const headers = next.headers ?? {};
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
      text: async () => JSON.stringify(next.body ?? ''),
      json: async () => next.body,
    } as unknown as Response;
  });
  return fn;
}

const OK: FakeReply = {
  status: 200,
  body: {
    model: 'gemini-test',
    usage: { total_tokens: 7 },
    choices: [{ message: { content: 'Hello there' } }],
  },
};

function makeDeps(fetchImpl: ReturnType<typeof fakeFetch>, overrides: Partial<ChatDeps> = {}) {
  const sleeps: number[] = [];
  let clock = 1_000_000;
  const deps: ChatDeps = {
    fetchImpl: fetchImpl as unknown as typeof fetch,
    apiKey: 'test-key',
    model: 'gemini-test',
    store: new MemoryRequestStore(),
    limiter: new MemoryRateLimiter(),
    retry: {
      attempts: 3,
      baseDelayMs: 10,
      maxDelayMs: 100,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      random: () => 0.5,
    },
    now: () => clock,
    ...overrides,
  };
  return { deps, sleeps, advance: (ms: number) => (clock += ms) };
}

const validData = (over: Record<string, unknown> = {}) => ({
  requestId: 'req-00000001',
  messages: [{ role: 'user', content: 'How was my day?' }],
  ...over,
});

describe('handleChat: happy path', () => {
  it('calls Gemini once with the key, model and cleaned messages', async () => {
    const f = fakeFetch([OK]);
    const { deps } = makeDeps(f);
    const result = await handleChat(deps, 'user1', validData());

    expect(result).toEqual({
      reply: 'Hello there',
      model: 'gemini-test',
      usage: { total_tokens: 7 },
      replayed: false,
    });
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as [string, any];
    expect(url).toBe(GEMINI_ENDPOINT);
    expect(init.headers.Authorization).toBe('Bearer test-key');
    const sent = JSON.parse(init.body);
    expect(sent.model).toBe('gemini-test');
    expect(sent.stream).toBe(false);
    expect(sent.temperature).toBe(0.7);
    expect(sent.messages).toEqual([{ role: 'user', content: 'How was my day?' }]);
  });

  it('lets the client set temperature but not the model', async () => {
    const f = fakeFetch([OK]);
    const { deps } = makeDeps(f);
    await handleChat(deps, 'user1', validData({ temperature: 0.2, model: 'expensive-model' }));
    const sent = JSON.parse((f.mock.calls[0] as [string, any])[1].body);
    expect(sent.temperature).toBe(0.2);
    expect(sent.model).toBe('gemini-test');
  });
});

describe('handleChat: validation', () => {
  it.each([
    ['missing', undefined],
    ['too short', 'abc'],
    ['bad characters', 'has spaces here!'],
    ['too long', 'a'.repeat(65)],
  ])('rejects a %s requestId', async (_label, requestId) => {
    const f = fakeFetch([OK]);
    const { deps } = makeDeps(f);
    await expect(handleChat(deps, 'u', validData({ requestId }))).rejects.toMatchObject({
      code: 'invalid-argument',
    });
    expect(f).not.toHaveBeenCalled();
  });

  it('rejects bad messages and temperature before calling the model', async () => {
    const f = fakeFetch([OK]);
    const { deps } = makeDeps(f);
    await expect(handleChat(deps, 'u', validData({ messages: [] }))).rejects.toMatchObject({
      code: 'invalid-argument',
    });
    await expect(handleChat(deps, 'u', validData({ temperature: 5 }))).rejects.toMatchObject({
      code: 'invalid-argument',
    });
    await expect(handleChat(deps, 'u', validData({ temperature: 'hot' }))).rejects.toMatchObject({
      code: 'invalid-argument',
    });
    expect(f).not.toHaveBeenCalled();
  });

  it('rejects non-object data', async () => {
    const { deps } = makeDeps(fakeFetch([OK]));
    await expect(handleChat(deps, 'u', null)).rejects.toMatchObject({ code: 'invalid-argument' });
  });
});

describe('handleChat: idempotency', () => {
  it('replays the saved answer for a repeated requestId without calling Gemini again', async () => {
    const f = fakeFetch([OK]);
    const { deps } = makeDeps(f);

    const first = await handleChat(deps, 'user1', validData());
    const second = await handleChat(deps, 'user1', validData());

    expect(f).toHaveBeenCalledTimes(1);
    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.reply).toBe(first.reply);
  });

  it('scopes requestIds per user', async () => {
    const f = fakeFetch([OK]);
    const { deps } = makeDeps(f);
    await handleChat(deps, 'user1', validData());
    const other = await handleChat(deps, 'user2', validData());
    expect(f).toHaveBeenCalledTimes(2);
    expect(other.replayed).toBe(false);
  });

  it('rejects a request that is still in progress', async () => {
    const f = fakeFetch([OK]);
    const { deps } = makeDeps(f);
    await deps.store.begin('user1', 'req-00000001', deps.now()); // another call holds the claim

    await expect(handleChat(deps, 'user1', validData())).rejects.toMatchObject({ code: 'aborted' });
    expect(f).not.toHaveBeenCalled();
  });

  it('takes over a pending request that has gone stale', async () => {
    const f = fakeFetch([OK]);
    const { deps, advance } = makeDeps(f);
    await deps.store.begin('user1', 'req-00000001', deps.now());
    advance(PENDING_STALE_MS + 1);

    const result = await handleChat(deps, 'user1', validData());
    expect(result.replayed).toBe(false);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('releases the claim on failure so the same requestId can be retried', async () => {
    const f = fakeFetch([{ status: 400, body: 'nope' }, OK]);
    const { deps } = makeDeps(f);

    await expect(handleChat(deps, 'user1', validData())).rejects.toMatchObject({ code: 'invalid-argument' });
    const retried = await handleChat(deps, 'user1', validData());

    expect(retried.reply).toBe('Hello there');
    expect(retried.replayed).toBe(false);
  });
});

describe('handleChat: retry', () => {
  it('retries a 429 and a 503 then succeeds, with one result stored', async () => {
    const f = fakeFetch([{ status: 429 }, { status: 503 }, OK]);
    const { deps, sleeps } = makeDeps(f);

    const result = await handleChat(deps, 'user1', validData());

    expect(result.reply).toBe('Hello there');
    expect(f).toHaveBeenCalledTimes(3);
    expect(sleeps).toHaveLength(2);
    // The retries are invisible to idempotency: replaying now costs no more calls.
    await handleChat(deps, 'user1', validData());
    expect(f).toHaveBeenCalledTimes(3);
  });

  it('retries network failures', async () => {
    const f = fakeFetch([new TypeError('fetch failed'), OK]);
    const { deps } = makeDeps(f);
    await expect(handleChat(deps, 'user1', validData())).resolves.toMatchObject({ reply: 'Hello there' });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('honors a Retry-After header', async () => {
    const f = fakeFetch([{ status: 429, headers: { 'retry-after': '0.05' } }, OK]);
    const { deps, sleeps } = makeDeps(f);
    await handleChat(deps, 'user1', validData());
    expect(sleeps[0]).toBeGreaterThanOrEqual(50);
  });

  it('does not retry a 400', async () => {
    const f = fakeFetch([{ status: 400 }]);
    const { deps } = makeDeps(f);
    await expect(handleChat(deps, 'user1', validData())).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(f).toHaveBeenCalledTimes(1);
  });
});

describe('handleChat: error mapping', () => {
  it.each([
    [429, 'resource-exhausted'],
    [500, 'unavailable'],
    [503, 'unavailable'],
    [401, 'internal'],
    [403, 'internal'],
  ])('maps a persistent upstream %i to %s', async (status, code) => {
    const f = fakeFetch([{ status }]);
    const { deps } = makeDeps(f);
    await expect(handleChat(deps, 'user1', validData())).rejects.toMatchObject({ code });
  });

  it('treats a 400 about the API key as our configuration problem, not the user input', async () => {
    const f = fakeFetch([{ status: 400, body: 'API key not valid. Please pass a valid API key.' }]);
    const { deps } = makeDeps(f);
    const err: any = await handleChat(deps, 'user1', validData()).catch((e) => e);
    expect(err.code).toBe('internal');
    expect(String(err.message)).not.toMatch(/valid API key/);
  });

  it('maps persistent network failure to unavailable', async () => {
    const f = fakeFetch([new TypeError('fetch failed')]);
    const { deps } = makeDeps(f);
    await expect(handleChat(deps, 'user1', validData())).rejects.toMatchObject({ code: 'unavailable' });
    expect(f).toHaveBeenCalledTimes(3);
  });

  it('never leaks the provider body or API key to the client', async () => {
    const f = fakeFetch([{ status: 401, body: 'key test-key is invalid, account acct_secret' }]);
    const { deps } = makeDeps(f);
    const err: any = await handleChat(deps, 'user1', validData()).catch((e) => e);
    expect(String(err.message)).not.toMatch(/test-key|acct_secret/);
  });

  it('toHttpsError passes HttpsErrors through untouched', () => {
    const original = toHttpsError(new UpstreamError(429, ''));
    expect(toHttpsError(original)).toBe(original);
  });
});

describe('handleChat: rate limiting', () => {
  it(`allows ${RATE_MAX_PER_WINDOW} requests a minute and blocks the next`, async () => {
    const f = fakeFetch([OK]);
    const { deps } = makeDeps(f);

    for (let i = 0; i < RATE_MAX_PER_WINDOW; i++) {
      await handleChat(deps, 'user1', validData({ requestId: `req-${String(i).padStart(8, '0')}` }));
    }
    await expect(
      handleChat(deps, 'user1', validData({ requestId: 'req-overflow1' })),
    ).rejects.toMatchObject({ code: 'resource-exhausted' });

    expect(f).toHaveBeenCalledTimes(RATE_MAX_PER_WINDOW);
  });

  it('frees the window after a minute', async () => {
    const f = fakeFetch([OK]);
    const { deps, advance } = makeDeps(f);
    for (let i = 0; i < RATE_MAX_PER_WINDOW; i++) {
      await handleChat(deps, 'user1', validData({ requestId: `req-${String(i).padStart(8, '0')}` }));
    }
    advance(60_001);
    await expect(
      handleChat(deps, 'user1', validData({ requestId: 'req-afterwait' })),
    ).resolves.toMatchObject({ replayed: false });
  });

  it('limits each user separately', async () => {
    const f = fakeFetch([OK]);
    const { deps } = makeDeps(f);
    for (let i = 0; i < RATE_MAX_PER_WINDOW; i++) {
      await handleChat(deps, 'user1', validData({ requestId: `req-${String(i).padStart(8, '0')}` }));
    }
    await expect(handleChat(deps, 'user2', validData())).resolves.toMatchObject({ replayed: false });
  });

  it('does not count replays against the limit', async () => {
    const f = fakeFetch([OK]);
    const { deps } = makeDeps(f);
    for (let i = 0; i < RATE_MAX_PER_WINDOW + 5; i++) {
      await handleChat(deps, 'user1', validData()); // same requestId every time
    }
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('releases the claim when rate limited so the requestId works later', async () => {
    const f = fakeFetch([OK]);
    const { deps, advance } = makeDeps(f);
    for (let i = 0; i < RATE_MAX_PER_WINDOW; i++) {
      await handleChat(deps, 'user1', validData({ requestId: `req-${String(i).padStart(8, '0')}` }));
    }
    await expect(handleChat(deps, 'user1', validData({ requestId: 'req-blocked01' }))).rejects.toMatchObject({
      code: 'resource-exhausted',
    });
    advance(60_001);
    await expect(handleChat(deps, 'user1', validData({ requestId: 'req-blocked01' }))).resolves.toMatchObject({
      replayed: false,
    });
  });
});
