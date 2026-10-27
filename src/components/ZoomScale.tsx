import { MAX_TRIES } from '../lib/guessing';
import type { TryResult } from '../lib/types';

interface ZoomScaleProps {
  zooms: number[];
  results: TryResult[];
  /** Null once the Puzzle is over. */
  currentTry: number | null;
}

/** Six ticks, one per try, labelled with the zoom each one shows. */
export function ZoomScale({ zooms, results, currentTry }: ZoomScaleProps) {
  return (
    <div className="scale" aria-hidden="true">
      <div className="scale-ticks">
        {Array.from({ length: MAX_TRIES }, (_, i) => {
          const result = results[i];
          const className = result ?? (i === currentTry ? 'current' : 'empty');
          return <div key={i} className={`tick tick-${className}`} />;
        })}
      </div>
      <div className="scale-labels">
        {zooms.map((zoom, i) => (
          <span key={i}>{zoom}×</span>
        ))}
      </div>
    </div>
  );
}
