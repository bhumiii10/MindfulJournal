import { buildUserOnlyContext, extractJsonBlock, summarizeDayAndSave } from '../utils/summarizeDay';
import { callChat } from '../services/chat';
import {
  getAllMessagesForDate,
  getConversationByDate,
  getGoalStatsForDate,
  upsertDailySummary,
} from '../services/db';

jest.mock('../services/chat', () => ({ callChat: jest.fn() }));
jest.mock('../services/db', () => ({
  getAllMessagesForDate: jest.fn(),
  getGoalStatsForDate: jest.fn(),
  getConversationByDate: jest.fn(),
  upsertDailySummary: jest.fn(),
}));

const mockedChat = callChat as jest.Mock;
const mockedMessages = getAllMessagesForDate as jest.Mock;
const mockedStats = getGoalStatsForDate as jest.Mock;
const mockedConvo = getConversationByDate as jest.Mock;
const mockedUpsert = upsertDailySummary as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
  mockedStats.mockResolvedValue({ added: 3, completed: 2 });
  mockedConvo.mockResolvedValue({ id: 'c1', mood: 'Sunny' });
  mockedUpsert.mockResolvedValue(undefined);
});

describe('extractJsonBlock', () => {
  it('returns plain JSON as is', () => {
    expect(extractJsonBlock('{"a":1}')).toBe('{"a":1}');
  });

  it('pulls JSON out of surrounding prose and code fences', () => {
    expect(extractJsonBlock('Sure! ```json\n{"summary":"x"}\n``` hope that helps')).toBe('{"summary":"x"}');
  });

  it('spans nested braces', () => {
    expect(extractJsonBlock('x {"a":{"b":1}} y')).toBe('{"a":{"b":1}}');
  });

  it('returns null when there is no JSON object', () => {
    expect(extractJsonBlock('just words')).toBeNull();
    expect(extractJsonBlock('} backwards {')).toBeNull();
  });
});

describe('buildUserOnlyContext', () => {
  it('keeps only non-empty user messages, trimmed, joined by separators', () => {
    const out = buildUserOnlyContext([
      { role: 'assistant', content: 'secret assistant text' },
      { role: 'user', content: '  first  ' },
      { role: 'user', content: '   ' },
      { role: 'user', content: 'second' },
    ]);
    expect(out).toBe('first\n---\nsecond');
    expect(out).not.toContain('assistant');
  });

  it('keeps only the most recent messages up to the limit', () => {
    const msgs = Array.from({ length: 20 }, (_, i) => ({ role: 'user', content: `m${i}` }));
    const out = buildUserOnlyContext(msgs, 3);
    expect(out).toBe('m17\n---\nm18\n---\nm19');
  });

  it('returns an empty string when there is nothing from the user', () => {
    expect(buildUserOnlyContext([{ role: 'assistant', content: 'hi' }])).toBe('');
    expect(buildUserOnlyContext([])).toBe('');
  });

  it('caps very long context at 8000 characters', () => {
    const out = buildUserOnlyContext([{ role: 'user', content: 'x'.repeat(20000) }]);
    expect(out).toHaveLength(8000);
  });
});

describe('summarizeDayAndSave', () => {
  it('records stats and an empty summary without calling the AI when there are no messages', async () => {
    mockedMessages.mockResolvedValue([]);
    await summarizeDayAndSave('2026-11-07');

    expect(mockedChat).not.toHaveBeenCalled();
    expect(mockedUpsert).toHaveBeenCalledWith('2026-11-07', {
      mood: 'Sunny',
      goalsAdded: 3,
      goalsCompleted: 2,
      topics: [],
      summary: '',
    });
  });

  it('saves the summary and topics from a JSON reply', async () => {
    mockedMessages.mockResolvedValue([{ role: 'user', content: 'I had a great walk today.' }]);
    mockedChat.mockResolvedValue({
      reply: '{"summary":"  A lovely walk.  ","topics":["walking"," ","outdoors",3]}',
    });

    await summarizeDayAndSave('2026-11-07');

    expect(mockedUpsert).toHaveBeenCalledWith('2026-11-07', {
      mood: 'Sunny',
      goalsAdded: 3,
      goalsCompleted: 2,
      topics: ['walking', 'outdoors', '3'],
      summary: 'A lovely walk.',
    });
  });

  it('parses JSON wrapped in a code fence', async () => {
    mockedMessages.mockResolvedValue([{ role: 'user', content: 'Long day at work today.' }]);
    mockedChat.mockResolvedValue({ reply: 'Here you go:\n```json\n{"summary":"A long day at work.","topics":["work"]}\n```' });

    await summarizeDayAndSave('2026-11-07');
    expect(mockedUpsert.mock.calls[0][1]).toMatchObject({ summary: 'A long day at work.', topics: ['work'] });
  });

  it('caps topics at 10', async () => {
    mockedMessages.mockResolvedValue([{ role: 'user', content: 'Busy day with many things.' }]);
    const topics = Array.from({ length: 15 }, (_, i) => `t${i}`);
    mockedChat.mockResolvedValue({ reply: JSON.stringify({ summary: 'Busy day indeed.', topics }) });

    await summarizeDayAndSave('2026-11-07');
    expect(mockedUpsert.mock.calls[0][1].topics).toHaveLength(10);
  });

  it('falls back to plain text when the reply is not JSON', async () => {
    mockedMessages.mockResolvedValue([{ role: 'user', content: 'Went hiking with friends.' }]);
    mockedChat.mockResolvedValue({
      reply: 'You went hiking with friends and felt energised. The mountains were beautiful. It was a happy day.',
    });

    await summarizeDayAndSave('2026-11-07');

    const saved = mockedUpsert.mock.calls[0][1];
    expect(saved.summary).toContain('hiking');
    expect(saved.topics.length).toBeGreaterThan(0);
    expect(saved.topics.length).toBeLessThanOrEqual(8);
  });

  it("uses the user's own last messages when the model gives a too-short summary", async () => {
    mockedMessages.mockResolvedValue([
      { role: 'user', content: 'Cooked dinner for my family tonight.' },
      { role: 'assistant', content: 'Lovely!' },
    ]);
    mockedChat.mockResolvedValue({ reply: '{"summary":"ok","topics":[]}' });

    await summarizeDayAndSave('2026-11-07');
    expect(mockedUpsert.mock.calls[0][1].summary).toBe('Cooked dinner for my family tonight.');
  });

  it('sends the model only the user text, never assistant replies', async () => {
    mockedMessages.mockResolvedValue([
      { role: 'assistant', content: 'ASSISTANT_ONLY_TEXT' },
      { role: 'user', content: 'USER_TEXT_HERE' },
    ]);
    mockedChat.mockResolvedValue({ reply: '{"summary":"A day of reflection.","topics":["x"]}' });

    await summarizeDayAndSave('2026-11-07');

    const payload = mockedChat.mock.calls[0][0];
    expect(payload.map((m: any) => m.role)).toEqual(['system', 'user']);
    const sent = JSON.stringify(payload);
    expect(sent).toContain('USER_TEXT_HERE');
    expect(sent).not.toContain('ASSISTANT_ONLY_TEXT');
  });

  it('writes a placeholder when nothing usable comes back', async () => {
    mockedMessages.mockResolvedValue([{ role: 'assistant', content: 'only the assistant spoke' }]);
    mockedChat.mockResolvedValue({ reply: '' });

    await summarizeDayAndSave('2026-11-07');
    expect(mockedUpsert.mock.calls[0][1].summary).toBe('Summary not available yet.');
  });

  it('stores a null mood when the day has no conversation', async () => {
    mockedMessages.mockResolvedValue([]);
    mockedConvo.mockResolvedValue(null);
    await summarizeDayAndSave('2026-11-07');
    expect(mockedUpsert.mock.calls[0][1].mood).toBeNull();
  });

  it('does not save anything if the AI call fails', async () => {
    mockedMessages.mockResolvedValue([{ role: 'user', content: 'Hello there friend.' }]);
    mockedChat.mockRejectedValue(new Error('network down'));

    await expect(summarizeDayAndSave('2026-11-07')).rejects.toThrow('network down');
    expect(mockedUpsert).not.toHaveBeenCalled();
  });
});
