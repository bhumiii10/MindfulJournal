MindfulJournal
Smart AI journaling for iOS: chat about the day, get structured summaries and grounding exercises, and keep entries synced securely with Firebase. Built with React Native + TypeScript, Firebase Auth/Firestore/Cloud Functions, and Expo/EAS, with third‑party API access proxied via Functions (no keys in the app).

Features
AI journaling assistant: freeform chat that organizes thoughts, produces daily summaries, and suggests grounding exercises.

Secure auth and sync: email authentication and Firestore persistence with offline cache and indexes.

Privacy‑first API usage: Perplexity requests go through Cloud Functions with Secrets; keys are never bundled in the client.

Reliable local dev: Firebase emulators for Auth, Firestore, and Functions; deterministic seed data for repeatable testing.

iOS delivery: Expo/EAS build and run with Apple provisioning; Metro bundler for fast iteration.

Tech stack
Client: React Native, TypeScript, React Navigation, Expo.

Backend: Firebase Auth, Firestore, Cloud Functions (TypeScript, Admin SDK).

AI: Perplexity API integration via callable HTTPS Functions with retries/backoff and idempotency guards.

Tooling: npm/Node, Git/GitHub, Xcode, VS Code.

Architecture
Client app handles UI, auth, and offline‑first reads/writes; sensitive requests are sent to Cloud Functions.

Functions validate input, check auth context, enforce rate limits, and call Perplexity; results are written to Firestore.

Collections: users, entries, sessions, summaries; composite indexes for common queries.

Security and privacy
Secrets management: API keys stored in Firebase Secrets and read by Functions; no keys in the bundle or .env committed.

Prerequisites
Node 18+, npm or yarn; Expo CLI; Xcode (for iOS Simulator).

Firebase project with Auth and Firestore enabled; Firebase CLI installed and initialized.

Setup
Clone and install

git clone <repo> && cd mindfuljournal && npm install

Environment

Copy .env.example to .env; set Firebase web config; leave API keys empty (proxied via Functions).

iOS: add GoogleServices-Info.plist to ios/ per React Native Firebase docs.

Firebase Emulators (recommended)

cd functions && npm install

firebase login && firebase emulators:start (in /functions or root per setup)

Set secrets: firebase functions:secrets:set PERPLEXITY_API_KEY

Run app (iOS)

npx expo start and press i, or npx expo run:ios after npx expo prebuild --platform ios (first time).

Scripts
App: npm start (Expo dev), npm test (Jest), npm run lint (ESLint/TS).

Functions: cd functions && npm run build && npm run serve (emulators) or firebase deploy --only functions.


EAS: npx eas build --platform ios for device builds; secrets stored in EAS/Firebase, not in repo.

Usage
Sign up with email; create or import an entry; open the AI chat to reflect on the day.

Tap “Summarize” to generate a daily recap and suggested grounding exercises saved to the entry.

Entries and summaries sync automatically; usable offline with delta sync when back online.


https://github.com/user-attachments/assets/02521869-3770-4c1e-b091-fdeeca49ad9a



