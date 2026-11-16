// functions/src/retry.ts

/** An HTTP error from the model provider. */
export class UpstreamError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    public readonly retryAfterMs?: number,
  ) {
    super(`Upstream responded ${status}`);
    this.name = 'UpstreamError';
  }
}

export type RetryOptions = {
  /** Total tries, including the first one. */
  attempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  sleep: (ms: number) => Promise<void>;
  /** Returns a number in [0, 1). Injected so tests are deterministic. */
  random: () => number;
};

/** Retry network failures, rate limits (429) and server errors (5xx). Never other 4xx. */
export function isRetryable(err: unknown): boolean {
  if (err instanceof UpstreamError) {
    return err.status === 429 || err.status >= 500;
  }
  return true; // fetch threw: network failure or timeout
}

/** Exponential backoff with "equal jitter": half fixed, half random. */
export function backoffDelayMs(attempt: number, opts: RetryOptions, retryAfterMs?: number): number {
  const exp = Math.min(opts.maxDelayMs, opts.baseDelayMs * 2 ** (attempt - 1));
  const jittered = exp / 2 + opts.random() * (exp / 2);
  if (retryAfterMs !== undefined) {
    return Math.min(opts.maxDelayMs, Math.max(jittered, retryAfterMs));
  }
  return jittered;
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= opts.attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === opts.attempts) break;
      const retryAfter = err instanceof UpstreamError ? err.retryAfterMs : undefined;
      await opts.sleep(backoffDelayMs(attempt, opts, retryAfter));
    }
  }
  throw lastErr;
}
