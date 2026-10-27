import Fuse from 'fuse.js';
import { ANIMALS } from './animals';
import { normalize } from './guessing';

export const MAX_SUGGESTIONS = 5;

/**
 * Fuse tuning, pinned by the tests. `threshold` is how far a name may stray
 * from the query (0 exact, 1 anything); `location`/`distance` score a match
 * worse the further it sits from the start of the name, since typos keep the
 * opening letters far more often than they mangle them.
 */
const FUSE_OPTIONS = { threshold: 0.4, location: 0, distance: 5 } as const;

const indexes = new WeakMap<readonly string[], Fuse<string>>();

function indexFor(vocabulary: readonly string[]): Fuse<string> {
  let fuse = indexes.get(vocabulary);
  if (!fuse) {
    fuse = new Fuse(vocabulary, FUSE_OPTIONS);
    indexes.set(vocabulary, fuse);
  }
  return fuse;
}

/**
 * Autocomplete for a partial guess: names starting with the query first, then
 * names with a later word starting with it ("sea lion" for "li"); only when
 * neither finds anything, Fuse's fuzzy matches, which forgive typos ("girafe").
 * The exact query and anything
 * already tried are dropped — they'd waste a try.
 */
export function suggest(query: string, tried: readonly (string | null)[] = [], vocabulary: readonly string[] = ANIMALS): string[] {
  const q = normalize(query);
  if (!q) return [];
  const used = new Set(tried.filter((g): g is string => g !== null).map(normalize));
  const starts = vocabulary.filter((a) => a.startsWith(q));
  const inWord = vocabulary.filter((a) => !a.startsWith(q) && a.split(' ').some((word) => word.startsWith(q)));
  // A query that begins a real name is a prefix, not a typo: don't pad it with lookalikes.
  const exact = [...starts, ...inWord];
  const fuzzy = exact.length ? [] : indexFor(vocabulary).search(q).map((r) => r.item);
  return [...exact, ...fuzzy].filter((a) => a !== q && !used.has(a)).slice(0, MAX_SUGGESTIONS);
}
