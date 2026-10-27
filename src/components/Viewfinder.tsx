import { useEffect, useRef, useState } from 'react';
import type { Puzzle } from '../lib/types';
import { photoUrl } from '../lib/daily';
import { formatZoom, frame } from '../lib/viewfinder';

interface ViewfinderProps {
  puzzle: Puzzle;
  zoom: number;
  /** Once revealed the photo is named out loud and the corner marks relax. */
  revealed: boolean;
  reducedMotion: boolean;
}

/** The square camera frame: one photo, magnified about its focal point. */
export function Viewfinder({ puzzle, zoom, revealed, reducedMotion }: ViewfinderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize(entry.contentRect.width));
    observer.observe(element);
    setSize(element.clientWidth);
    return () => observer.disconnect();
  }, []);

  const placement = frame(size, puzzle.photo, puzzle.focus, zoom);

  return (
    <div className={`viewfinder ${revealed ? 'is-revealed' : ''}`} ref={ref}>
      {size > 0 ? (
        <img
          className={reducedMotion ? 'viewfinder-photo no-motion' : 'viewfinder-photo'}
          src={photoUrl(puzzle)}
          alt={revealed ? `A photo of ${puzzle.display}` : 'A zoomed-in photo of a mystery animal'}
          draggable={false}
          style={{
            width: `${placement.width}px`,
            height: `${placement.height}px`,
            transform: `translate(${placement.x}px, ${placement.y}px) scale(${placement.scale})`,
          }}
        />
      ) : null}
      <span className="corner corner-tl" />
      <span className="corner corner-tr" />
      <span className="corner corner-bl" />
      <span className="corner corner-br" />
      <span className="readout" aria-hidden="true">
        {formatZoom(zoom)}
      </span>
    </div>
  );
}
