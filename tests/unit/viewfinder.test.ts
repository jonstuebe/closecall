import { describe, expect, it } from 'vitest';
import { formatZoom, frame } from '../../src/lib/viewfinder';

const SIZE = 400;
const landscape = { width: 1024, height: 768 };
const portrait = { width: 768, height: 1024 };
const centre = { x: 0.5, y: 0.5 };

describe('frame', () => {
  it('covers the square at 1x, with no gap on either axis', () => {
    for (const photo of [landscape, portrait, { width: 500, height: 500 }]) {
      const f = frame(SIZE, photo, centre, 1);
      expect(f.width).toBeGreaterThanOrEqual(SIZE);
      expect(f.height).toBeGreaterThanOrEqual(SIZE);
    }
  });

  it('never lets an edge pull inside the frame', () => {
    const zooms = [1, 1.8, 4.5, 10];
    const corners = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 0.1, y: 0.9 },
    ];
    for (const zoom of zooms) {
      for (const focus of corners) {
        const f = frame(SIZE, landscape, focus, zoom);
        expect(f.x).toBeLessThanOrEqual(0);
        expect(f.y).toBeLessThanOrEqual(0);
        expect(f.x + f.width * zoom).toBeGreaterThanOrEqual(SIZE - 1e-9);
        expect(f.y + f.height * zoom).toBeGreaterThanOrEqual(SIZE - 1e-9);
      }
    }
  });

  it('puts an interior focal point at the centre of the frame', () => {
    const focus = { x: 0.5, y: 0.5 };
    const f = frame(SIZE, landscape, focus, 6);
    expect(f.x + focus.x * f.width * 6).toBeCloseTo(SIZE / 2);
    expect(f.y + focus.y * f.height * 6).toBeCloseTo(SIZE / 2);
  });

  it('zooming in only ever shows less of the photo', () => {
    const visible = (zoom: number) => SIZE / (frame(SIZE, landscape, centre, zoom).width * zoom);
    expect(visible(6)).toBeLessThan(visible(1));
  });

  it('survives a viewfinder that has not been measured yet', () => {
    expect(() => frame(0, landscape, centre, 10)).not.toThrow();
  });
});

describe('formatZoom', () => {
  it.each([
    [6, '6×'],
    [4.5, '4.5×'],
    [1, '1×'],
  ])('shows %s as %s', (zoom, expected) => {
    expect(formatZoom(zoom)).toBe(expected);
  });
});
