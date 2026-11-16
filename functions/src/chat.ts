// functions/src/chat.ts
// Core of the callable "chat" function. All side effects (network, Firestore, clock, sleep)
// come in through `deps`, so it is fully unit-testable.
import { HttpsError } from 'firebase-functions/v2/https';
import { callGemini } from './gemini';
import { normalizeMessages } from './messages';
import { UpstreamError, withRetry, type RetryOptions } from './retry';
import type { RateLimiter, RequestStore, StoredResult } from './stores/types';

export type ChatDeps = {
  fetchImpl: typeof fetch;
  apiKey: string;
  model: string;
  store: RequestStore;
  limiter: RateLimiter;
  retry: RetryOptions;
  now: () => number;
};

export type ChatResult = StoredResult & { replayed: boolean };

const REQUEST_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

function readTemperature(value: unknown): number {
  if (value === undefined || value === null) return 0.7;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 2) {
    throw new HttpsError('invalid-argument', 'temperature must be a number between 0 and 2');
  }
  return value;
}

/** Turn whatever went wrong into an error the client can understand, without leaking details. */
export function toHttpsError(err: unknown): HttpsError {
  if (err instanceof HttpsError) return err;
  if (err instanceof UpstreamError) {
    if (err.status === 400) {
      // Gemini reports a missing/invalid API key as a 400. That is our config problem, not the user's.
      if (/api[_ ]?key/i.test(err.body)) return new HttpsError('internal', 'AI service is not configured correctly.');
      return new HttpsError('invalid-argument', 'The AI provider rejected the request.');
    }
    if (err.status === 429) return new HttpsError('resource-exhausted', 'The AI provider is busy. Try again shortly.');
    if (err.status >= 500) return new HttpsError('unavailable', 'The AI provider is unavailable. Try again shortly.');
    return new HttpsError('internal', 'AI request failed.'); // 401/403/etc: our config problem
  }
  return new HttpsError('unavailable', 'Could not reach the AI provider. Try again shortly.');
}

export async function handleChat(deps: ChatDeps, uid: string, data: unknown): Promise<ChatResult> {
  const body = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};

  const requestId = body.requestId;
  if (typeof requestId !== 'string' || !REQUEST_ID_RE.test(requestId)) {
    throw new HttpsError('invalid-argument', 'requestId must be 8-64 characters of letters, digits, _ or -');
  }
  const messages = normalizeMessages(body.messages);
  const temperature = readTemperature(body.temperature);

  // Idempotency: a repeated request returns the saved answer and never calls the model again.
  const begun = await deps.store.begin(uid, requestId, deps.now());
  if (begun.state === 'done') return { ...begun.result, replayed: true };
  if (begun.state === 'in_progress') {
    throw new HttpsError('aborted', 'This request is already being processed.');
  }

  try {
    const rate = await deps.limiter.hit(uid, deps.now());
    if (!rate.allowed) {
      throw new HttpsError(
        'resource-exhausted',
        `Too many requests. Try again in ${rate.retryAfterSec}s.`,
      );
    }

    const result = await withRetry(
      () =>
        callGemini({
          fetchImpl: deps.fetchImpl,
          apiKey: deps.apiKey,
          model: deps.model,
          messages,
          temperature,
        }),
      deps.retry,
    );

    await deps.store.complete(uid, requestId, result, deps.now());
    return { ...result, replayed: false };
  } catch (err) {
    // Release the claim so the client can retry this same requestId.
    await deps.store.fail(uid, requestId).catch(() => undefined);
    throw toHttpsError(err);
  }
}
