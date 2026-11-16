# MindfulJournal

An iOS journaling app: chat with an AI coach about your day, track daily goals and mood, do short guided wellness exercises, and see your progress over time. Built with React Native (TypeScript) and Firebase, with the AI reached through a callable Cloud Function so the API key never ships in the app.

## What's in the app

- **Home**: a calendar that highlights days you journaled, plus a quick mood check.
- **Journal**: per-day mood, goals (add, complete, delete) and suggested "quick wins".
- **Chat**: an AI coach conversation that is saved as that day's entry, with a step-by-step guided mode for exercises.
- **Insights**: day streak, a 7-day goals chart, weekly completion and mood distribution.
- **Tools**: a catalog of short evidence-aligned exercises you can filter, add as goals, or run in guided chat.
- **Profile**: your account and the AI-generated daily summaries.

Sign-in is email and password through Firebase Auth. The only login screen today is a dev login.

## How it works

```
App (React Native)
  ├─ Firebase Auth ─────────── email/password sign-in
  ├─ Cloud Firestore ───────── users/{uid}/conversations (+ messages, suggestions), goals, summaries
  └─ callable Function "chat" ─ the only path to the AI
        ├─ requires a signed-in user (checked by Firebase)
        ├─ validates and tidies the messages
        ├─ rate limits per user (20 requests/minute)
        ├─ idempotent: a repeated requestId returns the saved answer instead of calling the AI again
        ├─ retries 429s, 5xx errors and network failures with exponential backoff and jitter
        └─ calls Gemini with a server-side key (never in the app)
```

Firestore security rules (`firestore.rules`) let each user read and write only their own data. The function's bookkeeping collections (`aiRequests`, `rateLimits`) are server-only: clients are denied.

## Status

Development uses the **Firebase emulators**. The Cloud Function is real, deployable code, but it is **not deployed** to a Firebase project: deploying needs the Blaze (pay-as-you-go) plan. In dev builds the app connects to the local emulators automatically.

Not built yet: password reset, Apple/Google sign-in, editing or deleting journal entries, and a production deployment. There are no end-to-end UI tests.

## Prerequisites

- Node 22 (Node 18+ works for the app)
- Xcode and the iOS Simulator, plus CocoaPods
- Java 21+ (the Firestore emulator needs it) and the Firebase CLI: `npm install -g firebase-tools`
- A Firebase project with Auth and Firestore, and its `GoogleService-Info.plist` in `ios/MindfulJournal/`
- A Gemini API key (free from [Google AI Studio](https://aistudio.google.com/apikey))

## Setup

```bash
npm install
cd ios && pod install && cd ..
npm run functions:install
```

Put your Gemini key in `functions/.secret.local` (git-ignored; the emulator reads it):

```
GEMINI_API_KEY=your-key
```

## Run it locally

In three terminals, from the repo root:

```bash
npm run emulators      # Auth, Firestore and Functions emulators (UI at http://127.0.0.1:4000)
npm run seed           # optional: a demo user and a week of journal data
npm start              # Metro bundler
```

Then build the app: `npm run ios`.

Dev builds point Auth, Firestore and Functions at the emulators (`services/firebaseEmulators.ts`). Set `USE_EMULATORS` to `false` there to use your real Firebase project instead. The demo user's email and password are in `functions/scripts/seed.ts`, for the local emulator only.

## Tests and checks

```bash
npm run check                          # lint, typecheck, app tests, function typecheck and tests
npm test                               # app unit tests (Jest)
npm run functions:test                 # Cloud Function unit tests
npm --prefix functions run test:rules:emulated   # Firestore security rules (needs Java + firebase-tools)
```

What's covered:

- **Cloud Function** (`functions/src`): message cleanup, retry and backoff, idempotent replays, rate limiting, error mapping (including that provider errors and keys never leak to the client).
- **Security rules** (`functions/rules-test`): users reach only their own data; server-only collections are denied.
- **App**: the chat client's retry logic and request ids, the daily-summary generator, goal suggestions, the exercise catalog, date helpers, and an `App` smoke test.

GitHub Actions (`.github/workflows/ci.yml`) runs all of this on every pull request.

## Project layout

```
screens/            one file per tab or screen
services/           db.ts (Firestore), chat.ts + chatClient.ts (AI client), activeDate.ts, firebaseEmulators.ts
utils/              summarizeDay.ts (builds the daily summary from the chat)
data/tools.ts       the exercise catalog
functions/          Cloud Functions (callable "chat"), emulator seed script, rules tests
firestore.rules     security rules          firestore.indexes.json   composite indexes
firebase.json       emulator and deploy configuration
api/                the earlier Express proxy, no longer used by the app
```

## Demo

https://github.com/user-attachments/assets/02521869-3770-4c1e-b091-fdeeca49ad9a
