import type { CSSProperties } from 'react';
import { MAX_TRIES } from '../lib/guessing';
import type { TryResult } from '../lib/types';
import { formatZoom } from '../lib/viewfinder';
import { ResultMark } from './Icons';

interface ZoomScaleProps {
  zooms: number[];
  results: TryResult[];
  /** Null once the Puzzle is over. */
  currentTry: number | null;
}

/** Ticks between stops on the rule: five minor ones each side of every stop's major tick. */
const RULE_STEPS = MAX_TRIES * 6;

/**
 * A lens barrel's focal scale: one stop per try, read left to right as the camera pulls back.
 * An index marks the stop in play, and each spent stop carries its Try's mark.
 */
export function ZoomScale({ zooms, results, currentTry }: ZoomScaleProps) {
  return (
    <div className="scale" aria-hidden="true">
      <div className="scale-marks">
        {zooms.map((_, i) => (
          <span key={i}>{results[i] ? <ResultMark result={results[i]} /> : null}</span>
        ))}
        {currentTry === null ? null : <span className="scale-index" style={{ '--at': currentTry } as CSSProperties} />}
      </div>
      <svg className="scale-rule" viewBox={`0 0 ${RULE_STEPS} 10`} preserveAspectRatio="none">
        <path d={`M0 0.5H${RULE_STEPS}`} />
        {Array.from({ length: RULE_STEPS - 1 }, (_, k) => {
          const x = k + 1;
          const major = x % 6 === 3;
          return <path key={x} className={major ? 'scale-major' : undefined} d={`M${x} 0V${major ? 10 : 4}`} />;
        })}
      </svg>
      <div className="scale-labels">
        {zooms.map((zoom, i) => (
          <span key={i} className={i === currentTry ? 'is-current' : results[i] ? 'is-spent' : undefined}>
            {formatZoom(zoom)}
          </span>
        ))}
      </div>
    </div>
  );
}
