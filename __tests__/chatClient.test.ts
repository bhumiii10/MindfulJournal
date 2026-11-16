import {
  callChatWithRetry,
  cleanMessages,
  isRetryableCallableError,
  newRequestId,
  type CallableFn,
  type ChatPayload,
} from '../services/chatClient';

const noSleep = async () => {};
const REQUEST_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

describe('newRequestId', () => {
  it('matches the format the Cloud Function accepts', () => {
    for (let i = 0; i < 50; i++) expect(newRequestId()).toMatch(REQUEST_ID_RE);
  });

  it('is unique across calls', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newRequestId()));
    expect(ids.size).toBe(200);
  });

  it('is deterministic when the clock and randomness are injected', () => {
    expect(newRequestId(() => 1000, () => 0)).toBe(newRequestId(() => 1000, () => 0));
  });
});

describe('cleanMessages', () => {
  it('coerces roles and never leaves content empty', () => {
    const out = cleanMessages([
      { role: 'system', content: ' be kind ' },
      { role: 'oops' as any, content: '   ' },
      { role: 'assistant', content: undefined as any },
    ]);
    expect(out).toEqual([
      { role: 'system', content: 'be kind' },
      { role: 'user', content: ' ' },
      { role: 'assistant', content: ' ' },
    ]);
  });
});

describe('isRetryableCallableError', () => {
  it.each(['unavailable', 'deadline-exceeded', 'aborted', 'functions/unavailable', 'functions/aborted'])(
    'retries %s',
    (code) => expect(isRetryableCallableError({ code })).toBe(true),
  );

  it.each(['unauthenticated', 'invalid-argument', 'resource-exhausted', 'internal', 'functions/internal'])(
    'does not retry %s',
    (code) => expect(isRetryableCallableError({ code })).toBe(false),
  );

  it('does not retry things that are not callable errors', () => {
    expect(isRetryableCallableError(new Error('boom'))).toBe(false);
    expect(isRetryableCallableError(undefined)).toBe(false);
  });
});

describe('callChatWithRetry', () => {
  const messages = [{ role: 'user' as const, content: 'hello' }];

  it('returns the reply on success with a valid request id', async () => {
    const call = jest.fn<ReturnType<CallableFn>, Parameters<CallableFn>>().mockResolvedValue({
      data: { reply: 'hi there', model: 'x', replayed: false },
    });
    await expect(callChatWithRetry(call, messages, { sleep: noSleep })).resolves.toEqual({ reply: 'hi there' });
    const payload = call.mock.calls[0][0];
    expect(payload.requestId).toMatch(REQUEST_ID_RE);
    expect(payload.messages).toEqual([{ role: 'user', content: 'hello' }]);
  });

  it('retries an unavailable server and reuses the SAME requestId each time', async () => {
    const seen: ChatPayload[] = [];
    const call: CallableFn = jest
      .fn()
      .mockImplementationOnce(async (p: ChatPayload) => {
        seen.push(p);
        throw { code: 'functions/unavailable' };
      })
      .mockImplementationOnce(async (p: ChatPayload) => {
        seen.push(p);
        throw { code: 'unavailable' };
      })
      .mockImplementationOnce(async (p: ChatPayload) => {
        seen.push(p);
        return { data: { reply: 'finally' } };
      });

    await expect(callChatWithRetry(call, messages, { sleep: noSleep })).resolves.toEqual({ reply: 'finally' });
    expect(seen).toHaveLength(3);
    expect(new Set(seen.map((p) => p.requestId)).size).toBe(1);
  });

  it('backs off exponentially between attempts', async () => {
    const sleeps: number[] = [];
    const call = jest.fn().mockRejectedValue({ code: 'unavailable' });
    await expect(
      callChatWithRetry(call, messages, {
        attempts: 4,
        baseDelayMs: 100,
        sleep: async (ms) => {
          sleeps.push(ms);
        },
      }),
    ).rejects.toMatchObject({ code: 'unavailable' });
    expect(call).toHaveBeenCalledTimes(4);
    expect(sleeps).toEqual([100, 200, 400]);
  });

  it('does not retry errors that will not change', async () => {
    const call = jest.fn().mockRejectedValue({ code: 'functions/resource-exhausted' });
    await expect(callChatWithRetry(call, messages, { sleep: noSleep })).rejects.toMatchObject({
      code: 'functions/resource-exhausted',
    });
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('rejects an unexpected response shape', async () => {
    const call = jest.fn().mockResolvedValue({ data: { nope: true } });
    await expect(callChatWithRetry(call, messages, { sleep: noSleep })).rejects.toThrow(/unexpected response/);
  });

  it('uses the request id it is given', async () => {
    const call = jest.fn().mockResolvedValue({ data: { reply: 'ok' } });
    await callChatWithRetry(call, messages, { sleep: noSleep, requestId: 'fixed-request-id' });
    expect(call.mock.calls[0][0].requestId).toBe('fixed-request-id');
  });
});
