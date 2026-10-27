import type { TryResult } from '../lib/types';

interface GuessListProps {
  guesses: (string | null)[];
  results: TryResult[];
}

export function GuessList({ guesses, results }: GuessListProps) {
  if (!guesses.length) return null;
  return (
    <ol className="guesses" aria-label="Your guesses">
      {guesses.map((guess, i) => (
        <li key={i} className={`guess guess-${results[i]}`}>
          <span className="guess-number">{i + 1}</span>
          <span className="guess-dot" aria-hidden="true" />
          <span className="guess-text">{guess === null ? 'Zoomed out' : guess}</span>
        </li>
      ))}
    </ol>
  );
}
