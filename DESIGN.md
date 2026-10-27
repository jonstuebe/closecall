# Design

The interface is a field camera. The photograph fills a square viewfinder with crosshair corners and a zoom readout; everything else is the furniture around it.

## Tokens

Defined on `:root` in `src/styles.css`, redefined under `@media (prefers-color-scheme: dark)` (guarded by `:root:not([data-theme="light"])`) and again under `:root[data-theme="dark"]`, so the Settings override and the OS preference both work. A third set under `:root[data-contrast="high"]` pushes the result colours further apart.

| Token          | Light     | Dark      | Role                                            |
| -------------- | --------- | --------- | ----------------------------------------------- |
| `--bg`         | `#e7ecef` | `#10161b` | Page                                            |
| `--surface`    | `#f7f9fa` | `#1a232b` | Cards, inputs, dialogs                          |
| `--ink`        | `#17232e` | `#e4ebf0` | Body text                                       |
| `--muted`      | `#5a6873` | `#94a3ae` | Secondary text, distribution bars               |
| `--line`       | `#c9d3da` | `#2c3a45` | Borders, spent-tick background                  |
| `--lens`       | `#d9950f` | `#f2b33a` | Viewfinder corners, readout, current tick, focus ring |
| `--hit`        | `#267549` | `#47b07a` | A correct guess; the share button               |
| `--miss`       | `#a8422f` | `#e06d56` | A wrong guess; inline hints                     |
| `--skip`       | `#9aa7b1` | `#5e6e7a` | A deliberate zoom-out                           |
| `--on-accent`  | `#ffffff` | `#0e1418` | Text on `--hit`                                 |

Every foreground/background pair in use clears WCAG AA (4.5:1); `--lens` is used for non-text marks and focus rings only. The axe pass in `tests/e2e/a11y.spec.ts` is what keeps that true — change a colour and run it.

## Type

Bricolage Grotesque Variable (`@fontsource-variable/bricolage-grotesque`), self-hosted. 800 for the wordmark, result headline and zoom readout; 600 for buttons and emphasis; 400 for body. Base size 17px, line-height 1.45. Numerals that change in place — the zoom readout, the countdown, the stats — use `font-variant-numeric: tabular-nums` so nothing jitters.

## Layout

A single 460px column, centred, with 16px gutters and `env(safe-area-inset-*)` padding on `body` for notched phones. Reading order top to bottom: wordmark and controls, puzzle number and try counter, viewfinder, zoom ladder, input, guesses. The viewfinder is `aspect-ratio: 1` and full width, so the photo is the largest thing on the screen at every size.

## Motion

One idea: the camera pulling back. The photo's `transform` transitions over 750ms on `cubic-bezier(.2,.7,.2,1)` between tries, and once more on the reveal, when the corners and readout fade out. A rejected guess shakes the input for 350ms. Nothing else animates. Under `prefers-reduced-motion: reduce` both the zoom transition and the shake are dropped, and the loading sweep stops; the game is otherwise identical.

## Results without colour

The zoom ladder is positional: a tick's place says which try it was, and the reveal names the outcome in the guess list ("Zoomed out", the guess itself) rather than relying on its dot. The share text uses 🟩/🟥/⬜/⬛, which read as distinct glyphs in monochrome. High-contrast mode is for players who want the hues further apart anyway, not a substitute for any of this.
