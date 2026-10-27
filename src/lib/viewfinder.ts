import type { Focus, Photo } from './types';

/** The photo's placement inside the square viewfinder, in CSS pixels. */
export interface Frame {
  /** Unscaled size: the photo covering the viewfinder at 1x. */
  width: number;
  height: number;
  x: number;
  y: number;
  scale: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Places the photo so the Focus point sits at the centre of a `size`-wide square
 * viewfinder at `zoom`, without ever letting an edge pull inside the frame.
 *
 * The photo is first scaled to *cover* the square (so 1x shows as much as fits),
 * then magnified by `zoom` about the focal point.
 */
export function frame(size: number, photo: Pick<Photo, 'width' | 'height'>, focus: Focus, zoom: number): Frame {
  const aspect = photo.width / photo.height;
  const width = aspect >= 1 ? size * aspect : size;
  const height = aspect >= 1 ? size : size / aspect;
  const scaledWidth = width * zoom;
  const scaledHeight = height * zoom;
  return {
    width,
    height,
    x: clamp(size / 2 - focus.x * scaledWidth, size - scaledWidth, 0),
    y: clamp(size / 2 - focus.y * scaledHeight, size - scaledHeight, 0),
    scale: zoom,
  };
}

/** `6×`, `4.5×` — the zoom readout in the corner of the viewfinder. */
export function formatZoom(zoom: number): string {
  return `${Number.isInteger(zoom) ? zoom : zoom.toFixed(1)}×`;
}
