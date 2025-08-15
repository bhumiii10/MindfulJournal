import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type StoredMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
  createdAt?: FirebaseFirestoreTypes.FieldValue;
};

// Format a JS date into YYYY-MM-DD (journal key)
export function toDateISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Create a generic conversation (non date-based)
 */
export async function ensureConversation(title?: string) {
  const auth = getAuth(getApp());
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

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
 * Get or create the one conversation for this date
 */
export async function ensureDailyConversation(dateISO: string, titleHint?: string) {
  const auth = getAuth(getApp());
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  const db = firestore();

  // Check if a conversation for this date already exists
  const querySnap = await db
    .collection(`users/${uid}/conversations`)
    .where('date', '==', dateISO)
    .limit(1)
    .get();

  if (!querySnap.empty) {
    return querySnap.docs[0].id;
  }

  // Create it if it doesn't exist
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

/**
 * Add a message to a conversation
 */
export async function addMessage(
  conversationId: string,
  msg: Omit<StoredMessage, 'createdAt'>
) {
  const auth = getAuth(getApp());
  const uid = auth.currentUser?.uid!;
  const db = firestore();
  await db
    .collection(`users/${uid}/conversations/${conversationId}/messages`)
    .add({
      ...msg,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
  await db
    .doc(`users/${uid}/conversations/${conversationId}`)
    .update({
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * Check if a conversation exists for a given date — return its ID or null
 */
export async function getDailyConversationId(dateISO: string) {
  const auth = getAuth(getApp());
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  const db = firestore();
  const querySnap = await db
    .collection(`users/${uid}/conversations`)
    .where('date', '==', dateISO)
    .limit(1)
    .get();

  return querySnap.empty ? null : querySnap.docs[0].id;
}

export async function getMessages(conversationId: string) {
  const auth = getAuth(getApp());
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  const db = firestore();
  const snap = await db
    .collection(`users/${uid}/conversations/${conversationId}/messages`)
    .orderBy('createdAt', 'asc')
    .get();

  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as (StoredMessage & { id: string })[];
}

/**
 * Add a manual goal
 */
export async function addGoal(title: string, dateISO: string, sourceConversationId?: string) {
  const uid = getAuth(getApp()).currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  await firestore()
    .collection(`users/${uid}/goals`)
    .add({
      title,
      done: false,
      date: dateISO,
      sourceConversationId: sourceConversationId ?? null,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * Toggle a goal's completion state
 */
export async function toggleGoal(goalId: string, done: boolean) {
  const uid = getAuth(getApp()).currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  await firestore()
    .doc(`users/${uid}/goals/${goalId}`)
    .update({ done });
}

/**
 * Delete a specific goal
 */
export async function deleteGoal(goalId: string) {
  const uid = getAuth(getApp()).currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  await firestore()
    .doc(`users/${uid}/goals/${goalId}`)
    .delete();
}

/**
 * Realtime listener for all goals on a given date
 */
export function onGoalsByDate(dateISO: string, callback: (rows: any[]) => void) {
  const uid = getAuth(getApp()).currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  return firestore()
    .collection(`users/${uid}/goals`)
    .where('date', '==', dateISO)
    .orderBy('createdAt', 'asc')
    .onSnapshot(
      (snap) => {
        const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        callback(rows);
      },
      (error) => {
        console.error('onGoalsByDate error:', error);
      }
    );
}

// ---------------------------------------------------
// TYPES
// ---------------------------------------------------
export type ChatSuggestion = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  source: 'chat';
  // When reading, Firestore returns Timestamp; when writing, we send FieldValue
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

// ---------------------------------------------------
// ADD SUGGESTIONS FROM CHAT
// ---------------------------------------------------
export async function addChatSuggestions(
  conversationId: string,
  dateISO: string,
  titles: string[]
) {
  const uid = getAuth(getApp()).currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  if (!conversationId) throw new Error('Conversation ID required');
  if (!titles || titles.length === 0) return;

  const batch = firestore().batch();
  const colRef = firestore().collection(
    `users/${uid}/conversations/${conversationId}/suggestions`
  );

  const now = firestore.FieldValue.serverTimestamp();

  titles.forEach((title) => {
    const docRef = colRef.doc();
    batch.set(docRef, {
      title: title.trim(),
      date: dateISO,           // IMPORTANT: field name is "date" (Insights/Journal rely on this)
      source: 'chat',
      createdAt: now,
    });
  });

  await batch.commit();
}

// ---------------------------------------------------
// REALTIME LISTENER FOR CHAT SUGGESTIONS BY DATE
// ---------------------------------------------------
export function onChatSuggestionsByDate(
  conversationId: string,
  dateISO: string,
  callback: (rows: ChatSuggestion[]) => void
) {
  const uid = getAuth(getApp()).currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  if (!conversationId) throw new Error('Conversation ID required');

  return firestore()
    .collection(`users/${uid}/conversations/${conversationId}/suggestions`)
    .where('date', '==', dateISO)
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      (snap) => {
        const rows = snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as any) }) as ChatSuggestion
        );
        callback(rows);
      },
      (error) => {
        console.error('onChatSuggestionsByDate error:', error);
      }
    );
}

// ---------------------------------------------------
// INSIGHTS HELPERS (used by InsightsScreen)
// ---------------------------------------------------

// Get all goals on a specific date
export async function getGoalsByDate(dateISO: string): Promise<GoalDoc[]> {
  const uid = getAuth(getApp()).currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  const snap = await firestore()
    .collection(`users/${uid}/goals`)
    .where('date', '==', dateISO)
    .get();

  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as GoalDoc[];
}

// Get goals for multiple dates (returns map by date)
export async function getGoalsByDates(dates: string[]): Promise<Record<string, GoalDoc[]>> {
  const out: Record<string, GoalDoc[]> = {};
  for (const dateISO of dates) {
    out[dateISO] = await getGoalsByDate(dateISO);
  }
  return out;
}

// Get the conversation for a date (to read mood)
export async function getConversationByDate(dateISO: string): Promise<ConversationDoc | null> {
  const uid = getAuth(getApp()).currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  const snap = await firestore()
    .collection(`users/${uid}/conversations`)
    .where('date', '==', dateISO)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...(doc.data() as any) } as ConversationDoc;
}

// Get conversations for multiple dates (returns map by date)
export async function getConversationsByDates(dates: string[]): Promise<Record<string, ConversationDoc | null>> {
  const out: Record<string, ConversationDoc | null> = {};
  for (const dateISO of dates) {
    out[dateISO] = await getConversationByDate(dateISO);
  }
  return out;
}
