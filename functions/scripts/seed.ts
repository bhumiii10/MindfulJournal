// functions/scripts/seed.ts
// Fills the LOCAL Firebase emulators with a demo user and a week of journal data.
//
//   firebase emulators:start        (in one terminal, from the repo root)
//   npm --prefix functions run seed (in another)
//
// Deterministic: fixed ids and content, so running it twice gives the same result.
// It only ever talks to the emulators: the hosts below are set before the Admin SDK starts.

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8085';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? 'localhost:9099';

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'mindfuljournal-c6289';

// Test-only credentials for the local emulator. They exist nowhere else.
const DEMO_UID = 'demo-user';
const DEMO_EMAIL = 'demo@mindfuljournal.test';
const DEMO_PASSWORD = 'demo-password-123';

type Day = {
  mood: string;
  title: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  goals: Array<{ title: string; done: boolean }>;
  summary: string;
  topics: string[];
};

// Index 0 is today, 1 is yesterday, and so on.
const DAYS: Day[] = [
  {
    mood: 'Sunny',
    title: 'A good day',
    messages: [
      { role: 'user', content: 'Today felt really good. I finished my project and went for a walk.' },
      { role: 'assistant', content: 'That sounds lovely. What made the walk feel good?' },
    ],
    goals: [
      { title: '10-minute walk', done: true },
      { title: 'Gratitude journal (3 items)', done: false },
    ],
    summary: 'A productive and energising day, finished a project and enjoyed a walk.',
    topics: ['work', 'walking', 'energy'],
  },
  {
    mood: 'Partly Cloudy',
    title: 'Mixed feelings',
    messages: [
      { role: 'user', content: 'A bit stressed about deadlines but I got through my list.' },
      { role: 'assistant', content: 'Getting through the list is a win. What helped most?' },
    ],
    goals: [{ title: '5-minute breathing', done: true }],
    summary: 'Some deadline stress, managed with a short breathing break.',
    topics: ['deadlines', 'stress', 'breathing'],
  },
  {
    mood: 'Cloudy',
    title: 'Quiet day',
    messages: [{ role: 'user', content: 'Not much happened. I felt a little flat.' }],
    goals: [{ title: 'Hydrate (8 glasses)', done: false }],
    summary: 'A quiet, slightly flat day.',
    topics: ['rest', 'low energy'],
  },
  {
    mood: 'Rainy',
    title: 'Hard morning',
    messages: [
      { role: 'user', content: 'Woke up anxious and could not shake it until lunch.' },
      { role: 'assistant', content: 'That sounds hard. What shifted things after lunch?' },
    ],
    goals: [
      { title: '3-minute 5-4-3-2-1 grounding', done: true },
      { title: 'Step outside for fresh air', done: true },
    ],
    summary: 'Morning anxiety that eased after grounding and some fresh air.',
    topics: ['anxiety', 'grounding', 'fresh air'],
  },
  {
    mood: 'Sunny',
    title: 'Catching up with friends',
    messages: [{ role: 'user', content: 'Had dinner with friends. Laughed a lot.' }],
    goals: [{ title: 'Reach out to a friend', done: true }],
    summary: 'A joyful evening with friends.',
    topics: ['friends', 'laughter'],
  },
  {
    mood: 'Partly Cloudy',
    title: 'Slow start',
    messages: [{ role: 'user', content: 'Slept badly, but the afternoon picked up.' }],
    goals: [{ title: 'Tidy one area', done: false }],
    summary: 'A slow start that improved by the afternoon.',
    topics: ['sleep', 'recovery'],
  },
  {
    mood: 'Cloudy',
    title: 'Reflecting',
    messages: [{ role: 'user', content: 'Thinking a lot about what I want from the next few months.' }],
    goals: [{ title: 'Write 1 worry and 1 action', done: true }],
    summary: 'A reflective day spent thinking about future plans.',
    topics: ['planning', 'reflection'],
  },
];

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function main() {
  initializeApp({ projectId: PROJECT_ID });
  const auth = getAuth();
  const db = getFirestore();

  // Demo user (reuse it if the emulator already has it).
  try {
    await auth.getUser(DEMO_UID);
    await auth.updateUser(DEMO_UID, { email: DEMO_EMAIL, password: DEMO_PASSWORD, displayName: 'Demo User' });
  } catch {
    await auth.createUser({ uid: DEMO_UID, email: DEMO_EMAIL, password: DEMO_PASSWORD, displayName: 'Demo User' });
  }

  const base = db.doc(`users/${DEMO_UID}`);
  const batch = db.batch();

  DAYS.forEach((day, offset) => {
    const date = isoDaysAgo(offset);
    const createdAt = Timestamp.fromDate(new Date(`${date}T09:00:00`));

    const convRef = base.collection('conversations').doc(`seed-${date}`);
    batch.set(convRef, {
      title: day.title,
      date,
      mood: day.mood,
      createdAt,
      updatedAt: createdAt,
      messageCount: day.messages.length,
      tokenIn: 0,
      tokenOut: 0,
    });

    day.messages.forEach((m, i) => {
      batch.set(convRef.collection('messages').doc(`m${i + 1}`), {
        role: m.role,
        content: m.content,
        createdAt: Timestamp.fromDate(new Date(`${date}T09:0${i}:00`)),
      });
    });

    day.goals.forEach((g, i) => {
      batch.set(base.collection('goals').doc(`seed-${date}-${i + 1}`), {
        title: g.title,
        done: g.done,
        date,
        sourceConversationId: null,
        createdAt: Timestamp.fromDate(new Date(`${date}T10:0${i}:00`)),
      });
    });

    batch.set(base.collection('summaries').doc(date), {
      date,
      mood: day.mood,
      goalsAdded: day.goals.length,
      goalsCompleted: day.goals.filter((g) => g.done).length,
      topics: day.topics,
      summary: day.summary,
      updatedAt: createdAt,
    });
  });

  await batch.commit();

  console.log(`Seeded ${DAYS.length} days for ${DEMO_EMAIL} into the emulators.`);
  console.log('Sign in with that email; the password is DEMO_PASSWORD in functions/scripts/seed.ts.');
}

main().catch((err) => {
  console.error('Seed failed. Are the emulators running? (firebase emulators:start)');
  console.error(err);
  process.exit(1);
});
