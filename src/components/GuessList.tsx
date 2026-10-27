import type { TryResult } from '../lib/types';
import { formatZoom } from '../lib/viewfinder';
import { ResultMark } from './Icons';

interface GuessListProps {
  guesses: (string | null)[];
  results: TryResult[];
  zooms: number[];
}

/** The frame log: each Try, the zoom it was made at, and how it went. */
export function GuessList({ guesses, results, zooms }: GuessListProps) {
  if (!guesses.length) return null;
  return (
    <ol className="guesses" aria-label="Your guesses">
      {guesses.map((guess, i) => (
        <li key={i} className={`guess guess-${results[i]}`}>
          <span className="guess-number">{i + 1}</span>
          <span className="guess-zoom">{formatZoom(zooms[i])}</span>
          <span className="guess-text">{guess === null ? 'Zoomed out' : guess}</span>
          <ResultMark result={results[i]} />
        </li>
      ))}
    </ol>
  );
}
