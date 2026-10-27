import { ANIMALS } from './animals';
import { normalize } from './guessing';

export const MAX_SUGGESTIONS = 5;

/**
 * Autocomplete for a partial guess: names starting with the query first, then
 * names with a later word starting with it ("sea lion" for "li"). The exact
 * query and anything already tried are dropped — they'd waste a try.
 */
export function suggest(query: string, tried: readonly (string | null)[] = [], vocabulary: readonly string[] = ANIMALS): string[] {
  const q = normalize(query);
  if (!q) return [];
  const used = new Set(tried.filter((g): g is string => g !== null).map(normalize));
  const starts = vocabulary.filter((a) => a.startsWith(q));
  const inWord = vocabulary.filter((a) => !a.startsWith(q) && a.split(' ').some((word) => word.startsWith(q)));
  return [...starts, ...inWord].filter((a) => a !== q && !used.has(a)).slice(0, MAX_SUGGESTIONS);
}
