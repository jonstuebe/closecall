import type { TryResult } from './types';
import { MAX_TRIES } from './guessing';

export const GAME_URL = 'closecall.jonstuebe.com';

/** One square per try, plus hollow squares for the tries never spent. */
export const MARKS: Record<TryResult | 'unused', string> = {
  hit: '🟩',
  miss: '🟥',
  skip: '⬜',
  unused: '⬛',
};

/** The tries as they happened: the winning guess is the only `hit`. */
export function tryResults(guesses: readonly (string | null)[], won: boolean): TryResult[] {
  return guesses.map((guess, i) => {
    if (guess === null) return 'skip';
    return won && i === guesses.length - 1 ? 'hit' : 'miss';
  });
}

/** The spoiler-free result row, e.g. `🟥⬜🟥🟩⬛⬛`. */
export function resultLine(results: readonly TryResult[]): string {
  const marks = results.map((r) => MARKS[r]);
  while (marks.length < MAX_TRIES) marks.push(MARKS.unused);
  return marks.join('');
}

export function buildShareText(puzzleNumber: number, results: readonly TryResult[], won: boolean): string {
  const score = won ? results.length : 'X';
  return `Close Call #${puzzleNumber} ${score}/${MAX_TRIES}\n\n🔍 ${resultLine(results)}\n\n${GAME_URL}`;
}

export type ShareOutcome = 'shared' | 'copied' | 'aborted' | 'failed';

/**
 * Native share sheet where available (phones), clipboard otherwise.
 * 'failed' means the caller should show the text for manual copying.
 */
export async function shareResults(text: string, nav: Navigator = navigator): Promise<ShareOutcome> {
  if (typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ text })) {
    try {
      await nav.share({ text });
      return 'shared';
    } catch (err) {
      if ((err as { name?: string } | null)?.name === 'AbortError') return 'aborted';
      // Otherwise fall through to the clipboard.
    }
  }
  try {
    if (!nav.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await nav.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
