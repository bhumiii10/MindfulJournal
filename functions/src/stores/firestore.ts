// functions/src/stores/firestore.ts
// Firestore-backed stores. Only the Admin SDK touches these paths; security rules deny clients.
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import {
  PENDING_STALE_MS,
  RATE_MAX_PER_WINDOW,
  RATE_WINDOW_MS,
  RECORD_TTL_MS,
  type BeginOutcome,
  type RateLimiter,
  type RateOutcome,
  type RequestStore,
  type StoredResult,
} from './types';

export class FirestoreRequestStore implements RequestStore {
  private ref(uid: string, requestId: string) {
    return getFirestore().doc(`users/${uid}/aiRequests/${requestId}`);
  }

  async begin(uid: string, requestId: string, now: number): Promise<BeginOutcome> {
    const ref = this.ref(uid, requestId);
    return getFirestore().runTransaction(async (tx): Promise<BeginOutcome> => {
      const snap = await tx.get(ref);
      if (snap.exists) {
        const d = snap.data() as any;
        if (d.status === 'done') return { state: 'done', result: d.result as StoredResult };
        if (d.status === 'pending' && now - Number(d.startedAt) < PENDING_STALE_MS) {
          return { state: 'in_progress' };
        }
      }
      tx.set(ref, {
        status: 'pending',
        startedAt: now,
        expireAt: Timestamp.fromMillis(now + RECORD_TTL_MS),
      });
      return { state: 'new' };
    });
  }

  async complete(uid: string, requestId: string, result: StoredResult, now: number): Promise<void> {
    await this.ref(uid, requestId).set({
      status: 'done',
      result: JSON.parse(JSON.stringify(result)), // drop undefined fields
      completedAt: now,
      expireAt: Timestamp.fromMillis(now + RECORD_TTL_MS),
    });
  }

  async fail(uid: string, requestId: string): Promise<void> {
    await this.ref(uid, requestId).delete();
  }
}

export class FirestoreRateLimiter implements RateLimiter {
  async hit(uid: string, now: number): Promise<RateOutcome> {
    const ref = getFirestore().doc(`users/${uid}/rateLimits/chat`);
    return getFirestore().runTransaction(async (tx): Promise<RateOutcome> => {
      const snap = await tx.get(ref);
      const d = snap.exists ? (snap.data() as { windowStart: number; count: number }) : null;

      if (!d || now - d.windowStart >= RATE_WINDOW_MS) {
        tx.set(ref, { windowStart: now, count: 1 });
        return { allowed: true };
      }
      if (d.count >= RATE_MAX_PER_WINDOW) {
        return { allowed: false, retryAfterSec: Math.ceil((d.windowStart + RATE_WINDOW_MS - now) / 1000) };
      }
      tx.update(ref, { count: d.count + 1 });
      return { allowed: true };
    });
  }
}
