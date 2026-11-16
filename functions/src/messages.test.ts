import { LIMITS, normalizeMessages } from './messages';

describe('normalizeMessages', () => {
  it('rejects non-arrays and empty arrays', () => {
    expect(() => normalizeMessages(undefined)).toThrow('messages array required');
    expect(() => normalizeMessages('hi')).toThrow('messages array required');
    expect(() => normalizeMessages([])).toThrow('messages array required');
  });

  it('rejects too many messages', () => {
    const many = Array.from({ length: LIMITS.maxMessages + 1 }, () => ({ role: 'user', content: 'x' }));
    expect(() => normalizeMessages(many)).toThrow(/too many messages/);
  });

  it('rejects a message that is too long', () => {
    const long = 'a'.repeat(LIMITS.maxContentChars + 1);
    expect(() => normalizeMessages([{ role: 'user', content: long }])).toThrow(/message too long/);
  });

  it('coerces unknown roles to user and keeps system/assistant', () => {
    const out = normalizeMessages([
      { role: 'system', content: 'be kind' },
      { role: 'robot', content: 'hello' },
      { role: 'assistant', content: 'hi' },
    ]);
    expect(out.map((m) => m.role)).toEqual(['system', 'user', 'assistant']);
  });

  it('never leaves content empty', () => {
    const out = normalizeMessages([{ role: 'user', content: '   ' }, { role: 'assistant' }]);
    expect(out[0].content).toBe(' ');
    expect(out[1].content).toBe(' ');
  });

  it('stringifies non-string content', () => {
    const out = normalizeMessages([{ role: 'user', content: 42 }]);
    expect(out[0].content).toBe('42');
  });

  it('merges consecutive same-role non-system messages', () => {
    const out = normalizeMessages([
      { role: 'user', content: 'one' },
      { role: 'user', content: 'two' },
      { role: 'assistant', content: 'ok' },
    ]);
    expect(out).toEqual([
      { role: 'user', content: 'one\ntwo' },
      { role: 'assistant', content: 'ok' },
    ]);
  });

  it('does not merge system messages', () => {
    const out = normalizeMessages([
      { role: 'system', content: 'a' },
      { role: 'system', content: 'b' },
      { role: 'user', content: 'hi' },
    ]);
    expect(out.map((m) => m.role)).toEqual(['system', 'system', 'user']);
  });

  it('inserts a user message when the first non-system message is from the assistant', () => {
    const out = normalizeMessages([
      { role: 'system', content: 'sys' },
      { role: 'assistant', content: 'welcome' },
    ]);
    expect(out.map((m) => m.role)).toEqual(['system', 'user', 'assistant']);
  });

  it('ignores non-object entries by treating them as empty user messages', () => {
    const out = normalizeMessages([null, 'text']);
    // Both become empty user messages, which merge into one placeholder.
    expect(out).toEqual([{ role: 'user', content: ' ' }]);
  });
});
