import { MAX_TRIES } from './guessing';

export const STORAGE_KEY = 'closecall:v1';

export type ThemeSetting = 'system' | 'light' | 'dark';
export type GameStatus = 'playing' | 'won' | 'lost';

/** One Puzzle as played. `null` in `guesses` is a zoom-out that cost a try. */
export interface PuzzleRecord {
  guesses: (string | null)[];
  status: GameStatus;
}

export interface Stats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  /** Wins on try 1..6 at indexes 0..5, losses at index 6. */
  distribution: number[];
  /** The last Puzzle number played to a finish, for streak continuity. */
  lastPuzzle: number | null;
  lastWon: boolean;
}

export interface Settings {
  theme: ThemeSetting;
  highContrast: boolean;
}

export interface GameState {
  results: Record<number, PuzzleRecord>;
  stats: Stats;
  settings: Settings;
  seenHelp: boolean;
}

const DISTRIBUTION_SIZE = MAX_TRIES + 1;

export function defaultState(): GameState {
  return {
    results: {},
    stats: { played: 0, wins: 0, currentStreak: 0, maxStreak: 0, distribution: Array(DISTRIBUTION_SIZE).fill(0), lastPuzzle: null, lastWon: false },
    settings: { theme: 'system', highContrast: false },
    seenHelp: false,
  };
}

export function emptyRecord(): PuzzleRecord {
  return { guesses: [], status: 'playing' };
}

/** Reads state, tolerating missing, corrupt, or partial data and blocked storage. */
export function loadState(storage: Storage | undefined = safeStorage()): GameState {
  const base = defaultState();
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    if (!parsed || typeof parsed !== 'object') return base;
    const distribution = Array.isArray(parsed.stats?.distribution) && parsed.stats.distribution.length === DISTRIBUTION_SIZE
      ? parsed.stats.distribution.map((n) => Number(n) || 0)
      : base.stats.distribution;
    return {
      results: sanitizeResults(parsed.results),
      stats: { ...base.stats, ...parsed.stats, distribution },
      settings: { ...base.settings, ...parsed.settings },
      seenHelp: parsed.seenHelp === true,
    };
  } catch {
    return base;
  }
}

function sanitizeResults(results: unknown): Record<number, PuzzleRecord> {
  if (!results || typeof results !== 'object') return {};
  const out: Record<number, PuzzleRecord> = {};
  for (const [key, value] of Object.entries(results as Record<string, unknown>)) {
    const number = Number(key);
    const record = value as Partial<PuzzleRecord> | null;
    if (!Number.isInteger(number) || !record || !Array.isArray(record.guesses)) continue;
    const status = record.status === 'won' || record.status === 'lost' ? record.status : 'playing';
    out[number] = { guesses: record.guesses.slice(0, MAX_TRIES), status };
  }
  return out;
}

export function saveState(state: GameState, storage: Storage | undefined = safeStorage()): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or quota exceeded: the game still works for this session.
  }
}

/** The Puzzle as the player left it, or a fresh one. */
export function recordFor(state: GameState, puzzle: number): PuzzleRecord {
  return state.results[puzzle] ?? emptyRecord();
}

/** Saves a try mid-game. Stats stay untouched until the Puzzle finishes. */
export function recordProgress(state: GameState, puzzle: number, record: PuzzleRecord): GameState {
  return { ...state, results: { ...state.results, [puzzle]: record } };
}

/**
 * Records a finished Puzzle, stats included. A no-op once that Puzzle has a
 * finished record, so a Puzzle can never be counted twice.
 */
export function recordResult(state: GameState, puzzle: number, record: PuzzleRecord): GameState {
  const existing = state.results[puzzle];
  if (existing && existing.status !== 'playing') return state;
  if (record.status === 'playing') return recordProgress(state, puzzle, record);

  const won = record.status === 'won';
  const slot = won ? record.guesses.length - 1 : MAX_TRIES;
  const distribution = state.stats.distribution.slice();
  distribution[slot] = (distribution[slot] ?? 0) + 1;
  const continues = state.stats.lastPuzzle === puzzle - 1 && state.stats.lastWon;
  const currentStreak = won ? (continues ? state.stats.currentStreak + 1 : 1) : 0;

  return {
    ...state,
    results: { ...state.results, [puzzle]: record },
    stats: {
      played: state.stats.played + 1,
      wins: state.stats.wins + (won ? 1 : 0),
      currentStreak,
      maxStreak: Math.max(state.stats.maxStreak, currentStreak),
      distribution,
      lastPuzzle: puzzle,
      lastWon: won,
    },
  };
}

/** The streak as of today: a missed day shows as 0 even before the next game. */
export function effectiveStreak(stats: Stats, today: number): number {
  if (stats.lastPuzzle === null) return 0;
  return today - stats.lastPuzzle <= 1 ? stats.currentStreak : 0;
}

export function winPercent(stats: Stats): number {
  return stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
}

function safeStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
