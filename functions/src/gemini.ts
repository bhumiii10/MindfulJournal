// functions/src/gemini.ts
import type { ChatMessage } from './messages';
import { UpstreamError } from './retry';

export const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

export type GeminiResult = { reply: string; model?: string; usage?: unknown };

type CallArgs = {
  fetchImpl: typeof fetch;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature: number;
  timeoutMs?: number;
};

function parseRetryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : undefined;
}

/** One attempt at the model. Throws UpstreamError on a non-2xx response. */
export async function callGemini(args: CallArgs): Promise<GeminiResult> {
  const { fetchImpl, apiKey, model, messages, temperature, timeoutMs = 30000 } = args;

  const resp = await fetchImpl(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, temperature, stream: false }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new UpstreamError(resp.status, body, parseRetryAfterMs(resp.headers.get('retry-after')));
  }

  const data: any = await resp.json();
  const reply = String(data?.choices?.[0]?.message?.content ?? '');
  return { reply, model: data?.model, usage: data?.usage };
}
