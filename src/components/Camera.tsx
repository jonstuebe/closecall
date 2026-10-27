import type { ReactNode } from 'react';

interface CameraProps {
  /** Puzzle number, or null before it's known. */
  number: number | null;
  date: string;
  /** Right-hand readout: the try counter mid-game, the outcome after. */
  status?: string;
  children: ReactNode;
}

/** The dark camera body around the viewfinder and lens scale, the same in both themes. */
export function Camera({ number, date, status, children }: CameraProps) {
  return (
    <section className="camera" aria-label="Today’s photo">
      <div className="camera-strip">
        <span>
          {number === null ? null : <strong className="camera-number">No. {number}</strong>}
          <span className="camera-date">{date}</span>
        </span>
        {status ? <span className="camera-status">{status}</span> : null}
      </div>
      {children}
    </section>
  );
}
