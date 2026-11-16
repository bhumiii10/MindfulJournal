// functions/src/index.ts
import { initializeApp } from 'firebase-admin/app';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { handleChat } from './chat';
import { FirestoreRateLimiter, FirestoreRequestStore } from './stores/firestore';

initializeApp();

// Locally the emulator reads this from functions/.secret.local.
// Deployed, it comes from Google Secret Manager (`firebase functions:secrets:set GEMINI_API_KEY`).
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
// Not secret: override with a GEMINI_MODEL environment variable if you want another model.
const DEFAULT_MODEL = 'gemini-2.5-flash';

const store = new FirestoreRequestStore();
const limiter = new FirestoreRateLimiter();

/**
 * Callable: chat({ requestId, messages, temperature? }) -> { reply, model, usage, replayed }
 * Auth is checked by Firebase; requestId makes retries safe (idempotent).
 */
export const chat = onCall(
  { secrets: [GEMINI_API_KEY], timeoutSeconds: 90, maxInstances: 5 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }

    return handleChat(
      {
        fetchImpl: fetch,
        apiKey: GEMINI_API_KEY.value(),
        model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
        store,
        limiter,
        retry: {
          attempts: 3,
          baseDelayMs: 500,
          maxDelayMs: 5000,
          sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
          random: Math.random,
        },
        now: Date.now,
      },
      request.auth.uid,
      request.data,
    );
  },
);
