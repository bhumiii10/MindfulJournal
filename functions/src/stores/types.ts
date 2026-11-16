// functions/src/stores/types.ts

export type StoredResult = { reply: string; model?: string; usage?: unknown };

export type BeginOutcome =
  | { state: 'new' }
  | { state: 'done'; result: StoredResult }
  | { state: 'in_progress' };

/** Remembers requests by (uid, requestId) so a repeated request never calls the model twice. */
export interface RequestStore {
  begin(uid: string, requestId: string, now: number): Promise<BeginOutcome>;
  complete(uid: string, requestId: string, result: StoredResult, now: number): Promise<void>;
  /** Release a claimed request after a failure so the client can retry it. */
  fail(uid: string, requestId: string): Promise<void>;
}

export type RateOutcome = { allowed: true } | { allowed: false; retryAfterSec: number };

export interface RateLimiter {
  hit(uid: string, now: number): Promise<RateOutcome>;
}

/** A request stuck in "pending" longer than this is treated as abandoned (function crashed). */
export const PENDING_STALE_MS = 2 * 60 * 1000;
/** Idempotency records are kept this long, then eligible for a Firestore TTL policy. */
export const RECORD_TTL_MS = 24 * 60 * 60 * 1000;

export const RATE_WINDOW_MS = 60 * 1000;
export const RATE_MAX_PER_WINDOW = 20;
