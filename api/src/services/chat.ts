// api/src/services/chat.ts
import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';

const API_BASE = 'http://localhost:8080'; // iOS Simulator -> Mac

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

type ChatResponse = { reply: string };

export async function callChat(messages: ChatMessage[]): Promise<ChatResponse> {
  const auth = getAuth(getApp());
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');

  // Firebase v22+ note in RN: getIdToken() is the correct API (already used)
  const idToken = await user.getIdToken();

  // Minimal hardening: normalize roles and ensure non-empty content
  const payload: ChatMessage[] = messages.map((m) => {
    const role: 'system' | 'user' | 'assistant' =
      m.role === 'assistant' || m.role === 'system' ? m.role : 'user';
    const raw = typeof m.content === 'string' ? m.content : String(m.content ?? '');
    const content = raw.trim() || ' ';
    return { role, content };
  });

  // DEBUG: outbound payload (roles + first few messages)
  try {
    // eslint-disable-next-line no-console
    console.log('[callChat] OUT roles ->', payload.map((m) => m.role).join(' | '));
    // eslint-disable-next-line no-console
    console.log('[callChat] OUT first ->', JSON.stringify(payload.slice(0, 6), null, 2));
  } catch {
    // ignore logging errors
  }

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
      messages: payload,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Chat failed: ${res.status} - ${text}`);
  }

  const data = (await res.json()) as ChatResponse;
  return data;
}
