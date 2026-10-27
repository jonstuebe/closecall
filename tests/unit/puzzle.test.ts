import { describe, expect, it } from 'vitest';
import { daysBetween, localDateKey, nextLocalMidnight } from '../../src/lib/puzzle';

describe('localDateKey', () => {
  it('reads the local calendar date, not the UTC one', () => {
    // 23:30 local on the 26th is already the 27th in UTC for a positive offset.
    expect(localDateKey(new Date(2026, 9, 26, 23, 30))).toBe('2026-10-26');
    expect(localDateKey(new Date(2026, 9, 26, 0, 30))).toBe('2026-10-26');
  });

  it('pads months and days', () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('daysBetween', () => {
  it('counts whole days', () => {
    expect(daysBetween('2026-10-26', '2026-10-29')).toBe(3);
    expect(daysBetween('2026-10-29', '2026-10-26')).toBe(-3);
  });

  it('is immune to DST: 1 November to 2 November is one day', () => {
    expect(daysBetween('2026-11-01', '2026-11-02')).toBe(1);
  });

  it('crosses a year end', () => {
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
  });
});

describe('nextLocalMidnight', () => {
  it('is the start of tomorrow, local time', () => {
    const next = nextLocalMidnight(new Date(2026, 9, 26, 17, 5, 3));
    expect(next.getFullYear()).toBe(2026);
    expect(next.getDate()).toBe(27);
    expect([next.getHours(), next.getMinutes(), next.getSeconds()]).toEqual([0, 0, 0]);
  });

  it('is always in the future, even at a second to midnight', () => {
    const now = new Date(2026, 9, 26, 23, 59, 59);
    expect(nextLocalMidnight(now).getTime()).toBeGreaterThan(now.getTime());
  });
});
