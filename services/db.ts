// services/db.ts
import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

// ---------------- Types ----------------
export type StoredMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
  createdAt?: FirebaseFirestoreTypes.FieldValue;
};

export type ChatSuggestion = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  source: 'chat';
  createdAt?: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue;
};

export type GoalDoc = {
  id: string;
  title: string;
  done: boolean;
  date: string; // YYYY-MM-DD
  createdAt?: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue;
  sourceConversationId?: string | null;
};

export type ConversationDoc = {
  id: string;
  title?: string;
  date?: string; // YYYY-MM-DD
  mood?: string | null;
  createdAt?: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue;
  updatedAt?: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue;
};

export type DailySummary = {
  date: string; // YYYY-MM-DD
  mood?: string | null;
  goalsAdded: number;
  goalsCompleted: number;
  topics?: string[];
  summary?: string;
  updatedAt?: FirebaseFirestoreTypes.FieldValue | FirebaseFirestoreTypes.Timestamp;
};

// ---------------- Utils ----------------
export function toDateISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function requireUid(): string {
  const auth = getAuth(getApp());
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  return uid;
}

// ---------------- Conversations ----------------
export async function ensureConversation(title?: string): Promise<string> {
  const uid = requireUid();
  const db = firestore();

  const ref = await db.collection(`users/${uid}/conversations`).add({
    title: title ?? 'Conversation',
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
    messageCount: 0,
    tokenIn: 0,
    tokenOut: 0,
  });

  return ref.id;
}

/**
 * Create or get the unique conversation for a date.
 */
export async function ensureDailyConversation(dateISO: string, titleHint?: string): Promise<string> {
  const uid = requireUid();
  const db = firestore();

  const querySnap = await db
    .collection(`users/${uid}/conversations`)
    .where('date', '==', dateISO)
    .limit(1)
    .get();

  if (!querySnap.empty) {
    const id = querySnap.docs[0].id;
    await db.doc(`users/${uid}/conversations/${id}`).set(
      {
        date: dateISO,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return id;
  }

  const ref = await db.collection(`users/${uid}/conversations`).add({
    title: titleHint ? titleHint.slice(0, 60) : `Journal for ${dateISO}`,
    date: dateISO,
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
    messageCount: 0,
    tokenIn: 0,
    tokenOut: 0,
  });

  return ref.id;
}

export async function getDailyConversationId(dateISO: string): Promise<string | null> {
  const uid = requireUid();
  const db = firestore();

  const querySnap = await db
    .collection(`users/${uid}/conversations`)
    .where('date', '==', dateISO)
    .limit(1)
    .get();

  return querySnap.empty ? null : querySnap.docs[0].id;
}

export async function getConversationByDate(dateISO: string): Promise<ConversationDoc | null> {
  const uid = requireUid();
  const db = firestore();

  const snap = await db
    .collection(`users/${uid}/conversations`)
    .where('date', '==', dateISO)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...(doc.data() as any) } as ConversationDoc;
}

export async function getConversationsByDates(dates: string[]): Promise<Record<string, ConversationDoc | null>> {
  const out: Record<string, ConversationDoc | null> = {};
  // Serial to keep it simple and avoid Firestore index limits.
  for (const dateISO of dates) {
    // eslint-disable-next-line no-await-in-loop
    out[dateISO] = await getConversationByDate(dateISO);
  }
  return out;
}

/**
 * Recent journal dates for highlighting (Home).
 */
export async function getRecentJournalDates(limitDays = 90): Promise<string[]> {
  const uid = requireUid();
  const db = firestore();

  const snap = await db
    .collection(`users/${uid}/conversations`)
    .orderBy('date', 'desc')
    .limit(300)
    .get();

  const set = new Set<string>();
  snap.forEach((doc) => {
    const v = doc.data() as any;
    if (typeof v?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.date)) set.add(v.date);
  });

  return Array.from(set).sort((a, b) => (a < b ? 1 : -1)).slice(0, limitDays);
}

// ---------------- Messages ----------------
export async function addMessage(conversationId: string, msg: Omit<StoredMessage, 'createdAt'>): Promise<void> {
  const uid = requireUid();
  const db = firestore();

  await db
    .collection(`users/${uid}/conversations/${conversationId}/messages`)
    .add({ ...msg, createdAt: firestore.FieldValue.serverTimestamp() });

  await db
    .doc(`users/${uid}/conversations/${conversationId}`)
    .update({ updatedAt: firestore.FieldValue.serverTimestamp() });
}

export async function getMessages(conversationId: string): Promise<(StoredMessage & { id: string })[]> {
  const uid = requireUid();
  const db = firestore();

  const snap = await db
    .collection(`users/${uid}/conversations/${conversationId}/messages`)
    .orderBy('createdAt', 'asc')
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as (StoredMessage & { id: string })[];
}

// ---------------- Goals ----------------
export async function addGoal(title: string, dateISO: string, sourceConversationId?: string): Promise<void> {
  const uid = requireUid();
  const db = firestore();

  await db.collection(`users/${uid}/goals`).add({
    title,
    done: false,
    date: dateISO,
    sourceConversationId: sourceConversationId ?? null,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
}

export async function toggleGoal(goalId: string, done: boolean): Promise<void> {
  const uid = requireUid();
  const db = firestore();
  await db.doc(`users/${uid}/goals/${goalId}`).update({ done });
}

export async function deleteGoal(goalId: string): Promise<void> {
  const uid = requireUid();
  const db = firestore();
  await db.doc(`users/${uid}/goals/${goalId}`).delete();
}

export function onGoalsByDate(dateISO: string, callback: (rows: any[]) => void) {
  const uid = requireUid();
  const db = firestore();

  return db
    .collection(`users/${uid}/goals`)
    .where('date', '==', dateISO)
    .orderBy('createdAt', 'asc')
    .onSnapshot(
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        callback(rows);
      },
      (error) => {
        // eslint-disable-next-line no-console
        console.error('onGoalsByDate error:', error);
      }
    );
}

export async function getGoalsByDate(dateISO: string): Promise<GoalDoc[]> {
  const uid = requireUid();
  const db = firestore();

  const snap = await db
    .collection(`users/${uid}/goals`)
    .where('date', '==', dateISO)
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as GoalDoc[];
}

export async function getGoalsByDates(dates: string[]): Promise<Record<string, GoalDoc[]>> {
  const out: Record<string, GoalDoc[]> = {};
  // Serial for simplicity
  for (const dateISO of dates) {
    // eslint-disable-next-line no-await-in-loop
    out[dateISO] = await getGoalsByDate(dateISO);
  }
  return out;
}

// ---------------- Chat Suggestions ----------------
export async function addChatSuggestions(conversationId: string, dateISO: string, titles: string[]): Promise<void> {
  const uid = requireUid();
  if (!conversationId || !titles?.length) return;

  const db = firestore();
  const colRef = db.collection(`users/${uid}/conversations/${conversationId}/suggestions`);
  const now = firestore.FieldValue.serverTimestamp();

  const batch = db.batch();
  titles.forEach((title) => {
    const ref = colRef.doc();
    batch.set(ref, {
      title: title.trim(),
      date: dateISO, // IMPORTANT: used in listeners and Insights
      source: 'chat',
      createdAt: now,
    });
  });

  await batch.commit();
}

export function onChatSuggestionsByDate(
  conversationId: string,
  dateISO: string,
  callback: (rows: ChatSuggestion[]) => void
) {
  const uid = requireUid();
  const db = firestore();

  return db
    .collection(`users/${uid}/conversations/${conversationId}/suggestions`)
    .where('date', '==', dateISO)
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as ChatSuggestion);
        callback(rows);
      },
      (error) => {
        // eslint-disable-next-line no-console
        console.error('onChatSuggestionsByDate error:', error);
      }
    );
}

// ---------------- Daily Summaries ----------------
export async function upsertDailySummary(dateISO: string, partial: Partial<DailySummary>): Promise<void> {
  const uid = requireUid();
  const db = firestore();

  const ref = db.doc(`users/${uid}/summaries/${dateISO}`);
  await ref.set(
    {
      date: dateISO,
      ...partial,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getDailySummary(dateISO: string): Promise<DailySummary | null> {
  const uid = requireUid();
  const db = firestore();

  const snap = await db.doc(`users/${uid}/summaries/${dateISO}`).get();
  if (!snap.exists()) return null;

  const data = snap.data();
  return data ? (data as DailySummary) : null;
}

export async function getRecentSummaries(limitDays = 60): Promise<DailySummary[]> {
  const uid = requireUid();
  const db = firestore();

  const snap = await db
    .collection(`users/${uid}/summaries`)
    .orderBy('date', 'desc')
    .limit(200)
    .get();

  const rows = snap.docs
    .map((d) => d.data() as DailySummary)
    .filter((s) => typeof s.date === 'string');

  return rows.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limitDays);
}

export async function getGoalStatsForDate(dateISO: string): Promise<{ added: number; completed: number }> {
  const uid = requireUid();
  const db = firestore();

  const col = db.collection(`users/${uid}/goals`);

  const [addedSnap, doneSnap] = await Promise.all([
    col.where('date', '==', dateISO).get(),
    col.where('date', '==', dateISO).where('done', '==', true).get(),
  ]);

  return { added: addedSnap.size, completed: doneSnap.size };
}

export async function getAllMessagesForDate(
  dateISO: string
): Promise<Array<{ role: 'user' | 'assistant' | 'system'; content: string }>> {
  const auth = getAuth(getApp());
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  const db = firestore();
  const querySnap = await db
    .collection(`users/${uid}/conversations`)
    .where('date', '==', dateISO)
    .limit(1)
    .get();

  if (querySnap.empty) return [];

  // FIX: docs is an array; take the first element
  const [firstDoc] = querySnap.docs;
  const cid = firstDoc.id;

  const snap = await db
    .collection(`users/${uid}/conversations/${cid}/messages`)
    .orderBy('createdAt', 'asc')
    .get();

  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      role: data.role as 'user' | 'assistant' | 'system',
      content: String(data.content ?? ''),
    };
  });
}
