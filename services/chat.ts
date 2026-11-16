// services/chat.ts
// The app's only way to reach the AI: the callable Cloud Function "chat".
// Firebase attaches the signed-in user's token for us; the Gemini key never leaves the server.
import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import functions from '@react-native-firebase/functions';
import { callChatWithRetry, type ChatMessage, type ChatResponse } from './chatClient';

export type { ChatMessage, ChatResponse };

export async function callChat(messages: ChatMessage[]): Promise<ChatResponse> {
  if (!getAuth(getApp()).currentUser) throw new Error('Not signed in');

  const callable = functions().httpsCallable('chat', { timeout: 90000 });
  return callChatWithRetry((payload) => callable(payload), messages);
}
