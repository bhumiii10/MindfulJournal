import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type StoredMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
  createdAt?: FirebaseFirestoreTypes.FieldValue;
};

/**
 * Format a JS date into YYYY-MM-DD (journal key)
 */
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
  console.log('[addGoal]', { uid, title, dateISO });
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
  console.log('[onGoalsByDate] subscribe for date', dateISO);

  if (!uid) throw new Error('Not signed in');

  return firestore()
    .collection(`users/${uid}/goals`)
    .where('date', '==', dateISO)
    .orderBy('createdAt', 'asc')
    .onSnapshot(
      (snap) => {
        const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        console.log('[onGoalsByDate] snapshot size', snap.size);

        callback(rows);
      },
      (error) => {
        console.error('onGoalsByDate error:', error);
      }
    );
}