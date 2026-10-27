import { useEffect } from 'react';

/**
 * Mirrors the visual viewport (the part of the page not under the on-screen keyboard)
 * into `--vv-height` and `--vv-top` on <html>, so CSS can fit the game to what's visible.
 */
export function useVisualViewport(): void {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    const update = () => {
      root.style.setProperty('--vv-height', `${viewport.height}px`);
      root.style.setProperty('--vv-top', `${viewport.offsetTop}px`);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);
}
