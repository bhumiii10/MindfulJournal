import {
  durationFilters,
  filterByMaxDuration,
  filterBySkill,
  skills,
  toolsCatalog,
} from '../data/tools';

describe('toolsCatalog integrity', () => {
  it('has unique ids', () => {
    const ids = toolsCatalog.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(toolsCatalog.map((t) => [t.id, t] as const))('%s is well formed', (_id, tool) => {
    expect(skills).toContain(tool.skill);
    expect(tool.title.trim()).not.toBe('');
    expect(tool.summary.trim()).not.toBe('');
    expect(tool.scienceNote.trim()).not.toBe('');
    expect(tool.goalTitle.trim()).not.toBe('');
    expect(tool.durationMin).toBeGreaterThanOrEqual(2);
    expect(tool.durationMin).toBeLessThanOrEqual(10);
    expect(tool.steps.length).toBeGreaterThanOrEqual(3);
    expect(tool.steps.length).toBeLessThanOrEqual(6);
    tool.steps.forEach((s) => expect(s.trim()).not.toBe(''));
  });

  it('has at least one featured quick action', () => {
    expect(toolsCatalog.some((t) => t.featured)).toBe(true);
  });

  it('only offers duration filters that match at least one exercise', () => {
    durationFilters.forEach((max) => {
      expect(filterByMaxDuration(toolsCatalog, max).length).toBeGreaterThan(0);
    });
  });
});

describe('filters', () => {
  it('filterBySkill returns everything with no skill', () => {
    expect(filterBySkill(toolsCatalog)).toBe(toolsCatalog);
  });

  it('filterBySkill keeps only that skill', () => {
    const out = filterBySkill(toolsCatalog, 'Emotional Regulation');
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((t) => t.skill === 'Emotional Regulation')).toBe(true);
  });

  it('filterByMaxDuration returns everything with no limit', () => {
    expect(filterByMaxDuration(toolsCatalog)).toBe(toolsCatalog);
  });

  it('filterByMaxDuration is inclusive of the limit', () => {
    const out = filterByMaxDuration(toolsCatalog, 5);
    expect(out.every((t) => t.durationMin <= 5)).toBe(true);
    expect(out.some((t) => t.durationMin === 5)).toBe(true);
  });

  it('filters combine', () => {
    const out = filterByMaxDuration(filterBySkill(toolsCatalog, 'Emotional Regulation'), 3);
    expect(out.every((t) => t.skill === 'Emotional Regulation' && t.durationMin <= 3)).toBe(true);
  });
});
