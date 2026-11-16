// functions/src/stores/memory.ts
// In-memory stores. Used by the unit tests; same behavior as the Firestore ones.
import {
  PENDING_STALE_MS,
  RATE_MAX_PER_WINDOW,
  RATE_WINDOW_MS,
  type BeginOutcome,
  type RateLimiter,
  type RateOutcome,
  type RequestStore,
  type StoredResult,
} from './types';

type Entry =
  | { status: 'pending'; startedAt: number }
  | { status: 'done'; result: StoredResult };

export class MemoryRequestStore implements RequestStore {
  readonly entries = new Map<string, Entry>();

  private key(uid: string, requestId: string) {
    return `${uid}/${requestId}`;
  }

  async begin(uid: string, requestId: string, now: number): Promise<BeginOutcome> {
    const key = this.key(uid, requestId);
    const existing = this.entries.get(key);
    if (existing?.status === 'done') return { state: 'done', result: existing.result };
    if (existing?.status === 'pending' && now - existing.startedAt < PENDING_STALE_MS) {
      return { state: 'in_progress' };
    }
    this.entries.set(key, { status: 'pending', startedAt: now });
    return { state: 'new' };
  }

  async complete(uid: string, requestId: string, result: StoredResult): Promise<void> {
    this.entries.set(this.key(uid, requestId), { status: 'done', result });
  }

  async fail(uid: string, requestId: string): Promise<void> {
    this.entries.delete(this.key(uid, requestId));
  }
}

export class MemoryRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, { windowStart: number; count: number }>();

  async hit(uid: string, now: number): Promise<RateOutcome> {
    const w = this.windows.get(uid);
    if (!w || now - w.windowStart >= RATE_WINDOW_MS) {
      this.windows.set(uid, { windowStart: now, count: 1 });
      return { allowed: true };
    }
    if (w.count >= RATE_MAX_PER_WINDOW) {
      return { allowed: false, retryAfterSec: Math.ceil((w.windowStart + RATE_WINDOW_MS - now) / 1000) };
    }
    w.count += 1;
    return { allowed: true };
  }
}
