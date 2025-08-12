import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type StoredMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
  createdAt?: FirebaseFirestoreTypes.FieldValue;
};

export async function ensureConversation(title?: string) {
  const auth = getAuth(getApp());
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  const db = firestore();
  const ref = await db
    .collection(`users/${uid}/conversations`)
    .add({
      title: title ?? 'Conversation',
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
      messageCount: 0,
      tokenIn: 0,
      tokenOut: 0,
    });
  return ref.id;
}

export async function addMessage(conversationId: string, msg: Omit<StoredMessage, 'createdAt'>) {
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
    .update({ updatedAt: firestore.FieldValue.serverTimestamp() });
}
