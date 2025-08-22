// Known-good full file: api/src/services/chat.ts
// Copy-paste this whole file verbatim.
import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { FUNCTION_URL } from '../../../src/config/env';

export type ChatRole = 'system' | 'user' | 'assistant';
export type ChatMessage = { role: ChatRole; content: string };
export type ChatResponse = { reply: string; raw?: unknown };

function toSinglePrompt(messages: ChatMessage[]): string {
  return messages.map((m) => `${m.role}: ${m.content}`).join('\n');
}

export async function callChat(messages: ChatMessage[]): Promise<ChatResponse> {
  if (!FUNCTION_URL) {
    throw new Error('Function URL not configured');
  }

  // Optional: include Firebase ID token if signed-in
  let idToken: string | undefined;
  try {
    const auth = getAuth(getApp());
    const user = auth.currentUser;
    if (user) {
      idToken = await user.getIdToken();
    }
  } catch {
    // Auth not available; proceed without token
  }

  // Normalize roles/content
  const payload: ChatMessage[] = messages.map((m) => {
    const role: ChatRole = m.role === 'assistant' || m.role === 'system' ? m.role : 'user';
    const content =
      (typeof m.content === 'string' ? m.content : String(m.content ?? '')).trim() || ' ';
    return { role, content };
  });

  // Build headers
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;

  // Send to your Firebase Function
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers,
    // If your function expects { prompt }:
    body: JSON.stringify({ prompt: toSinglePrompt(payload) }),
    // If your function expects { messages }, switch to:
    // body: JSON.stringify({ messages: payload }),
  });

  // Parse body safely
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const anyData = data as Record<string, unknown>;
    const errMsg =
      (typeof anyData?.error === 'string' && anyData.error) ||
      (typeof (anyData?.error as { message?: string })?.message === 'string' &&
        (anyData.error as { message: string }).message) ||
      (typeof anyData?.message === 'string' && (anyData.message as string)) ||
      `Upstream error: ${res.status}`;
    throw new Error(errMsg);
  }

  // Extract assistant text from common shapes
  const anyData = data as Record<string, unknown>;
  let reply: string | undefined;

  const choices = (anyData?.choices as Array<unknown>) || [];
  const firstChoice =
    Array.isArray(choices) && choices.length > 0
      ? (choices[0] as Record<string, unknown>)
      : undefined;
  const message = (firstChoice?.message as Record<string, unknown>) || undefined;

  if (typeof message?.content === 'string') {
    reply = message.content as string;
  } else if (typeof anyData?.reply === 'string') {
    reply = anyData.reply as string;
  } else if (typeof anyData?.content === 'string') {
    reply = anyData.content as string;
  }

  if (!reply) {
    reply = typeof data === 'string' ? (data as string) : JSON.stringify(data);
  }

  return { reply, raw: data };
}
