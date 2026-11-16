// functions/src/messages.ts
import { HttpsError } from 'firebase-functions/v2/https';

export type Role = 'system' | 'user' | 'assistant';
export type ChatMessage = { role: Role; content: string };

export const LIMITS = {
  maxMessages: 100,
  maxContentChars: 20000,
};

const SEED_USER_PROMPT =
  'Summarize today’s conversation and return strict JSON with "summary" and "topics".';

/**
 * Validate and tidy the client's messages for the model:
 * - coerce unknown roles to "user", never allow empty content
 * - merge consecutive same-role non-system messages (providers want alternation)
 * - make sure the first non-system message is from the user
 */
export function normalizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new HttpsError('invalid-argument', 'messages array required');
  }
  if (input.length > LIMITS.maxMessages) {
    throw new HttpsError('invalid-argument', `too many messages (max ${LIMITS.maxMessages})`);
  }

  const normalized: ChatMessage[] = input.map((m) => {
    const obj = m && typeof m === 'object' ? (m as Record<string, unknown>) : {};
    const role: Role = obj.role === 'assistant' || obj.role === 'system' ? obj.role : 'user';
    const raw = typeof obj.content === 'string' ? obj.content : String(obj.content ?? '');
    if (raw.length > LIMITS.maxContentChars) {
      throw new HttpsError(
        'invalid-argument',
        `message too long (max ${LIMITS.maxContentChars} characters)`,
      );
    }
    return { role, content: raw.trim() || ' ' };
  });

  const folded: ChatMessage[] = [];
  for (const m of normalized) {
    const prev = folded[folded.length - 1];
    if (prev && prev.role !== 'system' && m.role !== 'system' && prev.role === m.role) {
      folded[folded.length - 1] = {
        role: prev.role,
        content: `${prev.content.trim()}\n${m.content.trim()}`.trim() || ' ',
      };
    } else {
      folded.push(m);
    }
  }

  const firstNonSystem = folded.findIndex((x) => x.role !== 'system');
  if (firstNonSystem !== -1 && folded[firstNonSystem].role !== 'user') {
    folded.splice(firstNonSystem, 0, { role: 'user', content: SEED_USER_PROMPT });
  }

  return folded;
}
