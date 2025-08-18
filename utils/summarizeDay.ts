// utils/summarizeDay.ts
import { callChat, type ChatMessage } from '../api/src/services/chat';
import {
  getAllMessagesForDate,
  getGoalStatsForDate,
  getConversationByDate,
  upsertDailySummary,
} from '../services/db';

function extractJsonBlock(s: string): string | null {
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return s.slice(start, end + 1);
}

// Build a compact textual context from the last few user messages only.
// This avoids sending assistant/guided boilerplate that confuses the API.
function buildUserOnlyContext(messages: Array<{ role: string; content: unknown }>, limit = 12): string {
  const userMsgs = messages
    .filter((m) => m.role === 'user')
    .map((m) => (typeof m.content === 'string' ? m.content : String(m.content ?? '')))
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const tail = userMsgs.slice(-limit);
  if (tail.length === 0) return '';

  // Join with delineators; keep it small to avoid token bloat.
  const combined = tail.join('\n---\n').slice(0, 8000);
  return combined;
}

/**
 * Summarize a day's conversation and save it to users/{uid}/summaries/{dateISO}.
 * - Produces a concise 2–4 sentence summary and 5–8 topics.
 * - Also stores goalsAdded/goalsCompleted and mood.
 */
export async function summarizeDayAndSave(dateISO: string): Promise<void> {
  // 1) Load transcript for the date
  const all = await getAllMessagesForDate(dateISO);

  // 2) If no messages exist, still record stats/mood with empty summary
  if (!Array.isArray(all) || all.length === 0) {
    const [stats, convo] = await Promise.all([
      getGoalStatsForDate(dateISO),
      getConversationByDate(dateISO),
    ]);
    await upsertDailySummary(dateISO, {
      mood: convo?.mood ?? null,
      goalsAdded: stats.added,
      goalsCompleted: stats.completed,
      topics: [],
      summary: '',
    });
    return;
  }

  // Build compact user-only context
  const userContext = buildUserOnlyContext(all, 12);

  // If no user content exists, still proceed with a minimal placeholder
  const contextForModel = userContext || 'No user messages were recorded for this date.';

  // Single system + single user message payload
  const systemMessage = `
You are a concise journaling summarizer.

Task:
- Given the user's day context, produce:
  1) A 2–4 sentence plain-English summary (no formatting).
  2) 5–8 comma-separated topics/keywords.

Rules:
- No bullet points or emojis in the summary.
- Neutral, specific, helpful tone.
- Do not mention "assistant" or "user".

Output (strict JSON only):
{
  "summary": string,
  "topics": string[]
}
`.trim();

  // The entire context is embedded in the user turn, so the payload strictly alternates: system -> user
  const chatPayload: ChatMessage[] = [
    { role: 'system', content: systemMessage },
    {
      role: 'user',
      content: [
        'Here is the day context from user messages only (most recent last):',
        '---',
        contextForModel,
        '---',
        'Return only JSON with keys "summary" and "topics".',
      ].join('\n'),
    },
  ];

  const res = await callChat(chatPayload);

  // 3) Parse JSON or fallback
  let summaryText = '';
  let topics: string[] = [];

  try {
    const block = extractJsonBlock(res.reply) ?? res.reply;
    const parsed = JSON.parse(block);
    if (typeof parsed?.summary === 'string') summaryText = parsed.summary.trim();
    if (Array.isArray(parsed?.topics)) {
      topics = parsed.topics
        .map((t: unknown) => String(t).trim())
        .filter(Boolean)
        .slice(0, 10);
    }
  } catch {
    // Fallback: extract sentences and topics from raw text
    const clean = String(res.reply ?? '').replace(/\s+/g, ' ').trim();
    const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
    summaryText = sentences.slice(0, 4).join(' ').slice(0, 600);

    const words = clean.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
    const stop = new Set([
      'the','and','with','that','this','your','about','into','later','after','before','today','also','just',
      'you','are','was','were','been','will','shall','can','could','would','should','a','an','to','in','on',
      'of','at','it','is','as','for','from','but','not','they','them','their','there','here','then','than',
    ]);
    const freq = new Map<string, number>();
    for (const w of words) if (!stop.has(w)) freq.set(w, (freq.get(w) || 0) + 1);
    topics = Array.from(freq.entries())
      .sort(([, b], [, a]) => b - a)
      .slice(0, 8)
      .map(([w]) => w);
  }

  // 4) Harden: ensure a non-empty summaryText
  if (!summaryText || summaryText.trim().length < 8) {
    // Use last two user messages as ultimate fallback
    const userMsgs = all.filter((m) => m.role === 'user');
    const lastUser = userMsgs.length > 0 ? String(userMsgs[userMsgs.length - 1]?.content ?? '') : '';
    const secondLastUser =
      userMsgs.length > 1 ? String(userMsgs[userMsgs.length - 2]?.content ?? '') : '';
    const seed = [lastUser, secondLastUser].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    if (seed) {
      const sents = seed.split(/(?<=[.!?])\s+/).filter(Boolean);
      summaryText = sents.slice(0, 2).join(' ').slice(0, 400);
    }
  }
  if (!summaryText) {
    summaryText = 'Summary not available yet.';
  }

  // 5) Add mood and goal stats, then upsert
  const [stats, convo] = await Promise.all([
    getGoalStatsForDate(dateISO),
    getConversationByDate(dateISO),
  ]);

  await upsertDailySummary(dateISO, {
    mood: convo?.mood ?? null,
    goalsAdded: stats.added,
    goalsCompleted: stats.completed,
    topics,
    summary: summaryText,
  });
}
