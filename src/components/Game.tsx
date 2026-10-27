import { useCallback } from 'react';
import type { Puzzle } from '../lib/types';
import { MAX_TRIES, alreadyTried, isCorrect, normalize, zoomForTry } from '../lib/guessing';
import type { PuzzleRecord } from '../lib/storage';
import { tryResults } from '../lib/share';
import { Viewfinder } from './Viewfinder';
import { ZoomScale } from './ZoomScale';
import { GuessForm } from './GuessForm';
import { GuessList } from './GuessList';
import { Result } from './Result';
import { Camera } from './Camera';

interface GameProps {
  puzzle: Puzzle;
  puzzleNumber: number;
  /** Today's date as shown on the camera strip. */
  date: string;
  record: PuzzleRecord;
  onRecord: (record: PuzzleRecord) => void;
  onAnnounce: (message: string) => void;
  onToast: (message: string) => void;
  onExpire: () => void;
  reducedMotion: boolean;
}

export function Game({ puzzle, puzzleNumber, date, record, onRecord, onAnnounce, onToast, onExpire, reducedMotion }: GameProps) {
  const playing = record.status === 'playing';
  const won = record.status === 'won';
  const results = tryResults(record.guesses, won);
  // The reveal always ends at full zoom, however the Puzzle ended.
  const zoom = zoomForTry(puzzle, playing ? record.guesses.length : MAX_TRIES);

  const spend = useCallback(
    (guess: string | null) => {
      const guesses = [...record.guesses, guess];
      if (guess !== null && isCorrect(guess, puzzle)) {
        onAnnounce(`Correct, it’s ${puzzle.display}.`);
        onRecord({ guesses, status: 'won' });
        return;
      }
      if (guesses.length >= MAX_TRIES) {
        onAnnounce(`Out of tries. It was ${puzzle.display}.`);
        onRecord({ guesses, status: 'lost' });
        return;
      }
      onAnnounce(guess === null ? 'Zooming out.' : `Not ${guess}. Zooming out.`);
      onRecord({ guesses, status: 'playing' });
    },
    [record.guesses, puzzle, onAnnounce, onRecord],
  );

  const guess = useCallback(
    (raw: string): string | null => {
      if (!playing) return null;
      if (!normalize(raw)) return 'Type an animal, or zoom out without guessing.';
      if (alreadyTried(raw, record.guesses)) return 'You already tried that one.';
      spend(raw.trim().toLowerCase());
      return null;
    },
    [playing, record.guesses, spend],
  );

  const skip = useCallback(() => {
    if (playing) spend(null);
  }, [playing, spend]);

  const status = playing
    ? `Try ${record.guesses.length + 1} of ${MAX_TRIES}`
    : won
      ? `Got it on ${record.guesses.length}`
      : 'Out of tries';

  return (
    <>
      <Camera number={puzzleNumber} date={date} status={status}>
        <Viewfinder puzzle={puzzle} zoom={zoom} revealed={!playing} reducedMotion={reducedMotion} />
        <ZoomScale zooms={puzzle.zooms} results={results} currentTry={playing ? record.guesses.length : null} />
      </Camera>
      {playing ? (
        <GuessForm onGuess={guess} onSkip={skip} tried={record.guesses} disabled={false} />
      ) : (
        <Result
          puzzle={puzzle}
          puzzleNumber={puzzleNumber}
          won={won}
          tries={record.guesses.length}
          results={results}
          onExpire={onExpire}
          onToast={onToast}
        />
      )}
      <GuessList guesses={record.guesses} results={results} zooms={puzzle.zooms} />
    </>
  );
}
