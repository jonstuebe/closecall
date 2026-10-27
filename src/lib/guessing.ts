import type { Puzzle } from './types';

/** Tries per Puzzle. A guess and a deliberate zoom-out each cost one. */
export const MAX_TRIES = 6;

/**
 * Folds a typed guess to the form stored in `accept`: lowercase, unaccented,
 * letters and single spaces only, with a leading article dropped.
 */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(an?|the) /, '');
}

/** True when a guess names the animal. Tolerates a plural the author didn't list. */
export function isCorrect(guess: string, puzzle: Pick<Puzzle, 'accept'>): boolean {
  const g = normalize(guess);
  if (!g) return false;
  return puzzle.accept.includes(g) || puzzle.accept.includes(g.replace(/e?s$/, ''));
}

/** True when this guess was already tried; zoom-outs (null) never count. */
export function alreadyTried(guess: string, guesses: readonly (string | null)[]): boolean {
  const g = normalize(guess);
  return guesses.some((prev) => prev !== null && normalize(prev) === g);
}

/** The zoom in force on a given try: the last step is always the whole photo. */
export function zoomForTry(puzzle: Pick<Puzzle, 'zooms'>, tryIndex: number): number {
  return tryIndex >= MAX_TRIES ? 1 : (puzzle.zooms[tryIndex] ?? 1);
}
