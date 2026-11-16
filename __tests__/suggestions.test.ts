import { getSuggestedGoals } from '../services/suggestions';

const base = {
  dateISO: '2026-11-07',
};

describe('getSuggestedGoals', () => {
  it('returns the base suggestions when there is no mood', () => {
    const out = getSuggestedGoals({ ...base, existing: [] });
    expect(out).toEqual([
      'Gratitude journal (3 items)',
      '10-minute walk',
      'Hydrate (8 glasses)',
      '5-minute breathing',
      'Tidy one area',
    ]);
  });

  it('adds mood-specific suggestions', () => {
    expect(getSuggestedGoals({ ...base, mood: 'down', existing: [] })).toEqual(
      expect.arrayContaining(['Step outside for fresh air', 'Make a cup of tea']),
    );
    expect(getSuggestedGoals({ ...base, mood: 'struggling', existing: [] })).toContain('Write 1 worry and 1 action');
    expect(getSuggestedGoals({ ...base, mood: 'great', existing: [] })).toContain('Reach out to a friend');
    expect(getSuggestedGoals({ ...base, mood: 'good', existing: [] })).toContain('15-minute exercise');
  });

  it('ignores case and surrounding spaces in the mood', () => {
    const out = getSuggestedGoals({ ...base, mood: '  DOWN ', existing: [] });
    expect(out).toContain('Make a cup of tea');
  });

  it('adds nothing extra for a mood it does not know', () => {
    const out = getSuggestedGoals({ ...base, mood: 'Sunny', existing: [] });
    expect(out).toHaveLength(5);
  });

  it('leaves out goals the user already has, ignoring case and spacing', () => {
    const out = getSuggestedGoals({
      ...base,
      existing: ['10-MINUTE WALK', '  hydrate (8 glasses) '],
    });
    expect(out).not.toContain('10-minute walk');
    expect(out).not.toContain('Hydrate (8 glasses)');
    expect(out).toContain('Tidy one area');
  });

  it('returns nothing when everything is already a goal', () => {
    const existing = getSuggestedGoals({ ...base, existing: [] });
    expect(getSuggestedGoals({ ...base, existing })).toEqual([]);
  });
});
