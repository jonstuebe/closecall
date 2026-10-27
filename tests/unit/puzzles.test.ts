import { describe, expect, it } from 'vitest';
import data from '../../worker/puzzles.json';
import type { Puzzle } from '../../src/lib/types';
import { LAUNCH_DATE, isTodaySomewhere, parseDateKey, puzzleForDate, puzzleNumber } from '../../worker/puzzles';
import { normalize } from '../../src/lib/guessing';
import { puzzle } from './fixtures';

const PUZZLES = data as Puzzle[];
const at = (key: string, hour = 0) => parseDateKey(key)! + hour * 3_600_000;

describe('parseDateKey', () => {
  it('reads a valid key as UTC midnight', () => {
    expect(parseDateKey('2026-10-26')).toBe(Date.UTC(2026, 9, 26));
  });

  it.each(['2026-13-01', '2026-02-30', '2026-1-1', 'yesterday', ''])('rejects %s', (key) => {
    expect(parseDateKey(key)).toBeNull();
  });
});

describe('puzzleNumber', () => {
  it('is 1 on the launch date', () => {
    expect(puzzleNumber(parseDateKey(LAUNCH_DATE)!)).toBe(1);
  });

  it('counts on by whole days across a DST boundary', () => {
    expect(puzzleNumber(parseDateKey('2026-11-02')!)).toBe(8);
  });

  it('is 0 or less before launch', () => {
    expect(puzzleNumber(parseDateKey('2026-10-25')!)).toBe(0);
  });
});

describe('isTodaySomewhere', () => {
  const date = parseDateKey('2026-10-26')!;

  it('opens 14 hours early, for UTC+14', () => {
    expect(isTodaySomewhere(date, at('2026-10-25', 10) - 1)).toBe(false);
    expect(isTodaySomewhere(date, at('2026-10-25', 10))).toBe(true);
  });

  it('closes 12 hours late, for UTC−12', () => {
    expect(isTodaySomewhere(date, at('2026-10-27', 12) - 1)).toBe(true);
    expect(isTodaySomewhere(date, at('2026-10-27', 12))).toBe(false);
  });
});

describe('puzzleForDate', () => {
  const list = [puzzle({ id: 1 }), puzzle({ id: 2 })];

  it('serves the nth Puzzle on the nth day', () => {
    expect(puzzleForDate(list, '2026-10-27')).toEqual({ number: 2, puzzle: list[1] });
  });

  it('has nothing before launch or after the list runs out', () => {
    expect(puzzleForDate(list, '2026-10-25')).toBeNull();
    expect(puzzleForDate(list, '2026-10-28')).toBeNull();
  });
});

describe('the shipped puzzles', () => {
  it('number their ids in order from 1', () => {
    expect(PUZZLES.map((p) => p.id)).toEqual(PUZZLES.map((_, i) => i + 1));
  });

  it('always accept their own answer, in normalized form', () => {
    for (const p of PUZZLES) {
      expect(p.accept).toContain(p.answer);
      expect(p.accept.every((a) => normalize(a) === a)).toBe(true);
    }
  });

  it('zoom out in six steps, ending on the whole photo', () => {
    for (const p of PUZZLES) {
      expect(p.zooms).toHaveLength(6);
      expect(p.zooms.at(-1)).toBe(1);
      expect(p.zooms.every((z, i) => i === 0 || z < p.zooms[i - 1])).toBe(true);
    }
  });

  it('focus inside the photo and credit their source', () => {
    for (const p of PUZZLES) {
      expect(p.focus.x).toBeGreaterThanOrEqual(0);
      expect(p.focus.x).toBeLessThanOrEqual(1);
      expect(p.focus.y).toBeGreaterThanOrEqual(0);
      expect(p.focus.y).toBeLessThanOrEqual(1);
      expect(p.photo.credit).not.toBe('');
      expect(p.photo.width * p.photo.height).toBeGreaterThan(0);
    }
  });

  it('name each photo file only once', () => {
    const files = PUZZLES.map((p) => p.photo.file);
    expect(new Set(files).size).toBe(files.length);
  });
});
