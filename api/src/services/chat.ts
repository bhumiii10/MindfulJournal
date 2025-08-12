import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';

const API_BASE = 'http://localhost:8080'; // iOS Simulator -> Mac

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export async function callChat(messages: ChatMessage[]) {
  const auth = getAuth(getApp());
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');

  const idToken = await user.getIdToken();

  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      model: 'sonar',
      temperature: 0.7,
      stream: false,
      messages,
    }),
  });

  if (!res.ok) {
    throw new Error(`Chat failed: ${res.status} - ${await res.text()}`);
  }

  return (await res.json()) as { reply: string };
}
