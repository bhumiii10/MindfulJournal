import { UpstreamError, backoffDelayMs, isRetryable, withRetry, type RetryOptions } from './retry';

function makeOpts(overrides: Partial<RetryOptions> = {}) {
  const sleeps: number[] = [];
  const opts: RetryOptions = {
    attempts: 3,
    baseDelayMs: 100,
    maxDelayMs: 1000,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    random: () => 0.5,
    ...overrides,
  };
  return { opts, sleeps };
}

describe('isRetryable', () => {
  it('retries 429, 5xx and network errors', () => {
    expect(isRetryable(new UpstreamError(429, ''))).toBe(true);
    expect(isRetryable(new UpstreamError(500, ''))).toBe(true);
    expect(isRetryable(new UpstreamError(503, ''))).toBe(true);
    expect(isRetryable(new TypeError('fetch failed'))).toBe(true);
  });

  it('does not retry other 4xx', () => {
    expect(isRetryable(new UpstreamError(400, ''))).toBe(false);
    expect(isRetryable(new UpstreamError(401, ''))).toBe(false);
    expect(isRetryable(new UpstreamError(404, ''))).toBe(false);
  });
});

describe('backoffDelayMs', () => {
  it('grows exponentially and is capped', () => {
    const { opts } = makeOpts({ random: () => 1 }); // top of the jitter range
    expect(backoffDelayMs(1, opts)).toBe(100);
    expect(backoffDelayMs(2, opts)).toBe(200);
    expect(backoffDelayMs(3, opts)).toBe(400);
    expect(backoffDelayMs(10, opts)).toBe(1000);
  });

  it('keeps at least half the delay (equal jitter)', () => {
    const { opts } = makeOpts({ random: () => 0 });
    expect(backoffDelayMs(2, opts)).toBe(100);
  });

  it('honors Retry-After but caps it at maxDelayMs', () => {
    const { opts } = makeOpts({ random: () => 0.5 });
    expect(backoffDelayMs(1, opts, 800)).toBe(800);
    expect(backoffDelayMs(1, opts, 60000)).toBe(1000);
  });
});

describe('withRetry', () => {
  it('returns immediately on success without sleeping', async () => {
    const { opts, sleeps } = makeOpts();
    const fn = jest.fn().mockResolvedValue('ok');
    await expect(withRetry(fn, opts)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleeps).toEqual([]);
  });

  it('retries a 429 and then succeeds', async () => {
    const { opts, sleeps } = makeOpts();
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new UpstreamError(429, 'slow down'))
      .mockResolvedValueOnce('ok');
    await expect(withRetry(fn, opts)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(sleeps).toHaveLength(1);
  });

  it('gives up after the configured attempts and throws the last error', async () => {
    const { opts, sleeps } = makeOpts({ attempts: 3 });
    const fn = jest.fn().mockRejectedValue(new UpstreamError(503, 'down'));
    await expect(withRetry(fn, opts)).rejects.toMatchObject({ status: 503 });
    expect(fn).toHaveBeenCalledTimes(3);
    expect(sleeps).toHaveLength(2); // no sleep after the final failure
  });

  it('does not retry a non-retryable error', async () => {
    const { opts, sleeps } = makeOpts();
    const fn = jest.fn().mockRejectedValue(new UpstreamError(400, 'bad'));
    await expect(withRetry(fn, opts)).rejects.toMatchObject({ status: 400 });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleeps).toEqual([]);
  });

  it('retries network failures', async () => {
    const { opts } = makeOpts();
    const fn = jest.fn().mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce('ok');
    await expect(withRetry(fn, opts)).resolves.toBe('ok');
  });

  it('waits at least Retry-After between attempts', async () => {
    const { opts, sleeps } = makeOpts();
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new UpstreamError(429, '', 900))
      .mockResolvedValueOnce('ok');
    await withRetry(fn, opts);
    expect(sleeps[0]).toBe(900);
  });

  it('passes the attempt number to the function', async () => {
    const { opts } = makeOpts();
    const attempts: number[] = [];
    const fn = jest.fn().mockImplementation(async (attempt: number) => {
      attempts.push(attempt);
      if (attempt < 3) throw new UpstreamError(500, '');
      return 'ok';
    });
    await withRetry(fn, opts);
    expect(attempts).toEqual([1, 2, 3]);
  });
});
