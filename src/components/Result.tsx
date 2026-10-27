import { useState } from 'react';
import type { Puzzle, TryResult } from '../lib/types';
import { MAX_TRIES } from '../lib/guessing';
import { buildShareText, shareResults } from '../lib/share';
import { Countdown } from './Countdown';
import { ShareIcon } from './Icons';

interface ResultProps {
  puzzle: Puzzle;
  puzzleNumber: number;
  won: boolean;
  tries: number;
  results: TryResult[];
  onExpire: () => void;
  onToast: (message: string) => void;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function subtitle(won: boolean, tries: number): string {
  if (!won) return 'Six tries down. Tomorrow’s a new close call.';
  return tries === 1 ? 'First try, at full zoom. Sharp eyes.' : `You got it on try ${tries} of ${MAX_TRIES}.`;
}

export function Result({ puzzle, puzzleNumber, won, tries, results, onExpire, onToast }: ResultProps) {
  const [manual, setManual] = useState<string | null>(null);

  const share = async () => {
    const text = buildShareText(puzzleNumber, results, won);
    const outcome = await shareResults(text);
    if (outcome === 'copied') onToast('Copied results to clipboard');
    if (outcome === 'failed') {
      setManual(text);
      onToast('Copy your result below');
    }
  };

  return (
    <section className="result">
      <h2 className="result-title">{won ? `${capitalize(puzzle.display)}!` : `It was ${puzzle.display}.`}</h2>
      <p className="result-sub">{subtitle(won, tries)}</p>
      {puzzle.fact ? (
        <p className="result-fact">
          <strong>Did you know?</strong> {puzzle.fact}
        </p>
      ) : null}
      <button className="button button-share" type="button" onClick={share}>
        Share
        <ShareIcon />
      </button>
      {manual ? (
        <textarea className="manual" readOnly aria-label="Your result to copy" value={manual} onFocus={(e) => e.target.select()} />
      ) : null}
      <p className="credit">Photo: {puzzle.photo.credit}</p>
      <Countdown onExpire={onExpire} />
    </section>
  );
}
