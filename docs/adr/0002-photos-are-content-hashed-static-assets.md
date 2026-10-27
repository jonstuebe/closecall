# Photos are content-hashed static assets, not Worker payloads

A Puzzle's Photo is the answer: ship tomorrow's image and the game is over. But images are large and plentiful, so the two obvious ways of hiding them both fail at scale. Instead, Photos are ordinary static assets under `public/photos/`, named by the first 16 hex characters of their SHA-256 — `fc33cddafbfa396b.jpg` — and the Worker hands out *only today's* filename, inside the `/api/puzzle/<date>` payload it already gates (see [ADR 0001](0001-puzzles-served-by-worker.md)).

Nothing in the page source, the manifest or the service worker's precache lists any other Photo, and a filename can't be derived from a date, an answer or a Puzzle number. Cloudflare's CDN serves the bytes with no Worker invocation.

## Considered Options

- **Inline the Photos in the Worker bundle (base64 in `puzzles.json`):** how the original prototype did it. A Worker bundle is capped at a few megabytes compressed; a year of Photos is tens of megabytes. It also makes every deploy re-upload every Photo.
- **Stream the Photo through the Worker from R2 or KV:** fully hides the bytes behind the date gate, but adds a binding, a storage bill and a Worker invocation on the game's single largest request — to protect something the content hash already protects.
- **Name the files after the animal or the Puzzle number:** `raccoon.jpg` or `007.jpg` would be trivially enumerable.

## Consequences

- Photos are served and cached as static assets, so they are fast and cheap, but they are *public* to anyone holding the URL. The protection is unguessability, not authorisation — the same threat model as today's answer being readable in DevTools.
- Photos are deliberately excluded from the service worker's precache (`globPatterns` in `vite.config.ts`); precaching them would ship every answer. Today's Photo is cached at runtime on first view instead.
- `npm run photos` is the only supported way to add one: it strips metadata (a filename or GPS tag would give it away), caps the longest edge, computes the hash and writes the `worker/puzzles.json` entry and the `docs/sources.csv` row together.
