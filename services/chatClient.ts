// services/chatClient.ts
// Pure logic for talking to the "chat" Cloud Function: request ids and retries.
// No React Native or Firebase imports, so it is unit-testable.

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export type ChatResponse = { reply: string };

export type ChatPayload = { requestId: string; messages: ChatMessage[]; temperature?: number };
export type CallableFn = (payload: ChatPayload) => Promise<{ data: unknown }>;

export type RetryConfig = {
  /** Total tries, including the first. */
  attempts: number;
  baseDelayMs: number;
  sleep: (ms: number) => Promise<void>;
  requestId?: string;
};

export const DEFAULT_RETRY: Omit<RetryConfig, 'requestId'> = {
  attempts: 3,
  baseDelayMs: 600,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/** Unique per call. Matches the function's rule: 8-64 characters of letters, digits, _ or -. */
export function newRequestId(now: () => number = Date.now, random: () => number = Math.random): string {
  const rand = Array.from({ length: 12 }, () => Math.floor(random() * 36).toString(36)).join('');
  return `r${now().toString(36)}-${rand}`;
}

export function cleanMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) => {
    const role: ChatMessage['role'] = m.role === 'assistant' || m.role === 'system' ? m.role : 'user';
    const raw = typeof m.content === 'string' ? m.content : String(m.content ?? '');
    return { role, content: raw.trim() || ' ' };
  });
}

/** Errors worth trying again: the server was unreachable, timed out, or is still on this request. */
export function isRetryableCallableError(err: unknown): boolean {
  const code = String((err as { code?: unknown })?.code ?? '').replace(/^functions\//, '');
  return code === 'unavailable' || code === 'deadline-exceeded' || code === 'aborted';
}

/**
 * Call the function, retrying transient failures. Every attempt reuses the SAME requestId,
 * so if an earlier attempt actually reached the server, the server returns its saved answer
 * instead of asking the AI (and charging for it) a second time.
 */
export async function callChatWithRetry(
  call: CallableFn,
  messages: ChatMessage[],
  config: Partial<RetryConfig> = {},
): Promise<ChatResponse> {
  const { attempts, baseDelayMs, sleep } = { ...DEFAULT_RETRY, ...config };
  const requestId = config.requestId ?? newRequestId();
  const payload: ChatPayload = { requestId, messages: cleanMessages(messages), temperature: 0.7 };

  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const { data } = await call(payload);
      const reply = (data as { reply?: unknown } | null)?.reply;
      if (typeof reply !== 'string') throw new Error('Chat failed: the server sent an unexpected response.');
      return { reply };
    } catch (err) {
      lastErr = err;
      if (!isRetryableCallableError(err) || attempt === attempts) break;
      await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }
  throw lastErr;
}
