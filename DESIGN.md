# Design

The interface is a field camera. The photograph sits in a graphite camera body: an instrument strip on top, the square viewfinder with its corner marks, focus reticle and zoom readout, and a lens scale underneath. Everything else is the furniture around it.

## Tokens

Defined in OKLCH on `:root` in `src/styles.css`, redefined under `@media (prefers-color-scheme: dark)` (guarded by `:root:not([data-theme="light"])`) and again under `:root[data-theme="dark"]`, so the Settings override and the OS preference both work. A further set under `:root[data-contrast="high"]` pushes the result colours further apart. Neutrals carry a trace of chroma at hue 250, the slate the brand has always had.

| Token       | Light                  | Dark                   | Role                                                  |
| ----------- | ---------------------- | ---------------------- | ----------------------------------------------------- |
| `--bg`      | `oklch(0.958 .005 250)` | `oklch(0.16 .008 250)` | Page                                                  |
| `--surface` | `oklch(0.992 .002 250)` | `oklch(0.215 .01 250)` | Inputs, the Fact, dialogs                             |
| `--ink`     | `oklch(0.235 .018 250)` | `oklch(0.935 .006 250)` | Body text; primary buttons (with `--bg` text)         |
| `--muted`   | `oklch(0.48 .018 250)` | `oklch(0.71 .014 250)` | Secondary text                                        |
| `--line`    | `oklch(0.875 .008 250)` | `oklch(0.31 .012 250)` | Borders, the frame log's rules, distribution bars     |
| `--lens`    | `oklch(0.74 .155 72)`  | `oklch(0.81 .15 75)`   | Logo, the Fact's dot, focus ring                      |
| `--hit`     | `oklch(0.52 .12 152)`  | `oklch(0.74 .14 152)`  | A correct guess                                       |
| `--miss`    | `oklch(0.53 .15 33)`   | `oklch(0.71 .15 33)`   | A wrong guess; inline hints                           |
| `--skip`    | `oklch(0.66 .012 250)` | `oklch(0.52 .012 250)` | A deliberate zoom-out                                 |

The camera body has its own `--body-*` tokens (`--body`, `--body-edge`, `--body-ink`, `--body-muted`, `--body-line`, `--body-lens`, `--body-hit`, `--body-miss`, `--body-skip`). They're the same in both themes: a viewfinder surround is dark whatever the room. `.camera` re-scopes `--hit`, `--miss`, `--skip` and `--lens` to their body values, so anything inside it (the lens scale, the readout, the corner marks) reads against graphite without knowing it's there.

Every text pair clears WCAG AA (the lowest is the hint, `--miss` on `--bg`, at 5:1); `--lens` is used for marks and the focus ring on the page, and for text only inside the camera, where it's 9.7:1. The axe pass in `tests/e2e/a11y.spec.ts` is what keeps that true — change a colour and run it.

## Type

Two families on a contrast axis:

- **Bricolage Grotesque Variable** (`@fontsource-variable/bricolage-grotesque`) for everything a person reads: 800 for the wordmark and headlines, 600–700 for buttons and emphasis, 400 for body. Base size 17px, line-height 1.45.
- **Martian Mono Variable** (`@fontsource-variable/martian-mono`) for the instruments only: the puzzle number and try counter on the camera strip, the zoom readout, the lens-scale numerals, the frame numbers and zooms in the log, the countdown and the stats. Never for prose or buttons.

Both are self-hosted. Numerals that change in place use `font-variant-numeric: tabular-nums` so nothing jitters.

## Layout

A single 480px column, centred, with 16px gutters and `env(safe-area-inset-*)` padding on `body` for notched phones. Below 480px the camera body reaches 6px into the gutters, so the photo stays the largest thing on screen. Reading order top to bottom: wordmark and controls; the camera (strip, viewfinder, lens scale); the guess field with its attached Guess button; Zoom out; the frame log. After the reveal the field is replaced by the result: headline, the Fact, Share, credit, countdown.

**Compose mode.** On touch screens (`pointer: coarse`), focusing the guess field turns the page into a fixed column sized to `window.visualViewport` (`--vv-top` and `--vv-height`, set by `useVisualViewport`), so it fills exactly what the keyboard leaves visible. The header, lens scale, frame log and Zoom out step aside. The viewfinder shrinks to the largest square that fits (`min(100cqw, 100cqh)` in a size container). Suggestions become a row of 44px chips under the field instead of a dropdown over the photo. The Guess button doesn't take focus on press, so the keyboard stays up between Tries. Blurring the field restores the full layout.

The loading, "No connection" and "Back tomorrow" states render inside the viewfinder, so the camera is always there.

## Components

- **Lens scale** (`ZoomScale`): a ruler with a major tick per Try and five minor ticks between, numerals underneath. An amber index rides above the stop in play; each spent stop carries its Try's mark.
- **Result marks** (`ResultMark` in `Icons.tsx`): a dot for a hit, a cross for a miss, a dash for a zoom-out. The same three glyphs on the scale, in the frame log and in the help key.
- **Frame log** (`GuessList`): a ruled list, not cards: frame number, the zoom it was made at, the guess (struck through in `--miss` when wrong), the mark.
- **Buttons**: one primary shape, `--ink` with `--bg` text (Guess, Share, Start playing); a bordered ghost for Zoom out; 44px icon buttons with a tinted hover.

## Motion

One idea: the camera pulling back. The photo's `transform` and the lens index both move over 750ms on `cubic-bezier(.16,1,.3,1)`, so the scale tracks the lens. On the reveal the corner marks drift out to the edges and fade with the reticle and readout. Small state changes get 150–220ms: a new mark scales in, a new log row settles, dialogs and toasts rise into place. Entrances move but never fade in, so content is readable from the first frame even if an animation stalls. A rejected guess shakes the field for 350ms. Under `prefers-reduced-motion: reduce` all of it is dropped, and the loading sweep stops; the game is otherwise identical.

## Results without colour

The lens scale is positional and the marks are shapes: a stop's place says which Try it was, and dot / cross / dash say how it went. The frame log names every outcome in words as well ("Zoomed out", the guess itself, struck through when wrong). The share text uses 🟩/🟥/⬜/⬛, which read as distinct glyphs in monochrome. High-contrast mode is for players who want the hues further apart anyway, not a substitute for any of this.
