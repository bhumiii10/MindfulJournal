import { toDateISO } from '../services/db';
import { getActiveDate, setActiveDate } from '../services/activeDate';

describe('toDateISO', () => {
  it('formats as YYYY-MM-DD in local time', () => {
    expect(toDateISO(new Date(2026, 10, 7))).toBe('2026-11-07');
  });

  it('zero-pads month and day', () => {
    expect(toDateISO(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('handles the last day of the year', () => {
    expect(toDateISO(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });

  it('defaults to today', () => {
    expect(toDateISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('active date store', () => {
  it('starts on today and can be changed', () => {
    expect(getActiveDate()).toBe(toDateISO());
    setActiveDate('2026-11-16');
    expect(getActiveDate()).toBe('2026-11-16');
  });
});
