import { describe, expect, it } from 'vitest';
import {
  STORAGE_KEY,
  defaultState,
  effectiveStreak,
  emptyRecord,
  loadState,
  recordFor,
  recordProgress,
  recordResult,
  saveState,
  winPercent,
  type GameState,
  type PuzzleRecord,
} from '../../src/lib/storage';
import { blockedStorage, memoryStorage } from './fixtures';

const won = (guesses: (string | null)[]): PuzzleRecord => ({ guesses, status: 'won' });
const lost = (guesses: (string | null)[]): PuzzleRecord => ({ guesses, status: 'lost' });
const stored = (state: unknown) => memoryStorage({ [STORAGE_KEY]: JSON.stringify(state) });

/** Plays `numbers` in order, each won on the first try. */
function winStreak(numbers: number[]): GameState {
  return numbers.reduce((state, n) => recordResult(state, n, won(['raccoon'])), defaultState());
}

describe('loadState', () => {
  it('starts fresh with nothing stored', () => {
    expect(loadState(memoryStorage())).toEqual(defaultState());
  });

  it('round-trips through storage', () => {
    const storage = memoryStorage();
    const state = recordResult(defaultState(), 1, won(['fox', 'raccoon']));
    saveState(state, storage);
    expect(loadState(storage)).toEqual(state);
  });

  it.each(['{', 'null', '[]', '"nope"'])('falls back to a fresh state on junk: %s', (raw) => {
    expect(loadState(memoryStorage({ [STORAGE_KEY]: raw }))).toEqual(defaultState());
  });

  it('fills in fields a previous version never wrote', () => {
    const state = loadState(stored({ stats: { played: 3 } }));
    expect(state.stats.played).toBe(3);
    expect(state.stats.distribution).toEqual(defaultState().stats.distribution);
    expect(state.settings).toEqual(defaultState().settings);
  });

  it('drops a result that is not a list of guesses', () => {
    expect(loadState(stored({ results: { 1: { guesses: 'fox' }, 2: { guesses: [], status: 'won' } } })).results).toEqual({
      2: { guesses: [], status: 'won' },
    });
  });

  it('survives blocked storage, reading and writing', () => {
    expect(loadState(blockedStorage())).toEqual(defaultState());
    expect(() => saveState(defaultState(), blockedStorage())).not.toThrow();
  });
});

describe('recordFor', () => {
  it('is empty for a Puzzle never opened', () => {
    expect(recordFor(defaultState(), 7)).toEqual(emptyRecord());
  });
});

describe('recordProgress', () => {
  it('saves a try without touching stats', () => {
    const state = recordProgress(defaultState(), 1, { guesses: ['fox'], status: 'playing' });
    expect(state.results[1].guesses).toEqual(['fox']);
    expect(state.stats.played).toBe(0);
  });
});

describe('recordResult', () => {
  it('counts a win in the row for the try it took', () => {
    const state = recordResult(defaultState(), 1, won(['fox', 'raccoon']));
    expect(state.stats).toMatchObject({ played: 1, wins: 1, currentStreak: 1, maxStreak: 1 });
    expect(state.stats.distribution).toEqual([0, 1, 0, 0, 0, 0, 0]);
  });

  it('counts a loss in the X row and breaks the streak', () => {
    const state = recordResult(winStreak([1, 2]), 3, lost(Array(6).fill('fox')));
    expect(state.stats).toMatchObject({ played: 3, wins: 2, currentStreak: 0, maxStreak: 2 });
    expect(state.stats.distribution[6]).toBe(1);
  });

  it('extends a streak over consecutive days', () => {
    expect(winStreak([1, 2, 3]).stats).toMatchObject({ currentStreak: 3, maxStreak: 3 });
  });

  it('restarts the streak after a skipped day, keeping the best', () => {
    const state = recordResult(winStreak([1, 2, 3]), 9, won(['raccoon']));
    expect(state.stats).toMatchObject({ currentStreak: 1, maxStreak: 3 });
  });

  it('restarts the streak after a loss, even the very next day', () => {
    const afterLoss = recordResult(winStreak([1]), 2, lost(Array(6).fill('fox')));
    expect(recordResult(afterLoss, 3, won(['raccoon'])).stats).toMatchObject({ currentStreak: 1 });
  });

  it('refuses to count a finished Puzzle twice', () => {
    const once = recordResult(defaultState(), 1, won(['raccoon']));
    expect(recordResult(once, 1, won(['raccoon', 'fox']))).toBe(once);
  });

  it('saves a mid-game record without counting it', () => {
    const state = recordResult(defaultState(), 1, { guesses: ['fox'], status: 'playing' });
    expect(state.stats.played).toBe(0);
    expect(state.results[1].status).toBe('playing');
  });
});

describe('effectiveStreak', () => {
  const stats = winStreak([1, 2, 3]).stats;

  it('counts today and yesterday as unbroken', () => {
    expect(effectiveStreak(stats, 3)).toBe(3);
    expect(effectiveStreak(stats, 4)).toBe(3);
  });

  it('shows a missed day as 0 before the next game is played', () => {
    expect(effectiveStreak(stats, 5)).toBe(0);
  });

  it('is 0 before anything is played', () => {
    expect(effectiveStreak(defaultState().stats, 1)).toBe(0);
  });
});

describe('winPercent', () => {
  it('rounds, and is 0 with nothing played', () => {
    expect(winPercent(defaultState().stats)).toBe(0);
    expect(winPercent({ ...defaultState().stats, played: 3, wins: 2 })).toBe(67);
  });
});
