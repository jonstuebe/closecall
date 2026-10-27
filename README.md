# Close Call

A daily guessing game. Name the animal in a photo taken far too close; every wrong guess pulls the camera back a step. Six tries, then the reveal, then a spoiler-free result line like `🔍 🟥⬜🟩⬛⬛⬛`.

- One puzzle per day, the same for everyone, chosen from the player's **local** date.
- A small Cloudflare Worker serves only today's puzzle, so future answers can't be read from the page source (see [ADR 0001](docs/adr/0001-puzzles-served-by-worker.md)).
- Photos are static assets under content-hashed filenames, and only today's filename is ever handed out (see [ADR 0002](docs/adr/0002-photos-are-content-hashed-static-assets.md)).
- One attempt per day. Progress mid-puzzle, results, streaks and stats live in `localStorage` (`closecall:v1`); today's puzzle is cached in `closecall:puzzle`.
- Installable PWA. It needs the network once a day to fetch the puzzle and its photo; after that, today's game plays offline.

## Develop

```sh
npm install
npm run dev          # http://localhost:5173, with the Worker API running in workerd
npm run build        # typecheck + production build into dist/client (site) and dist/closecall (Worker)
npm run preview      # serve the build, Worker included (service worker enabled)
```

Node 26 (`mise.toml`). The first `npm install` may ask you to approve native install scripts: `npm install-scripts approve workerd esbuild`.

## Test

```sh
npm test             # Vitest: date keys across time zones/DST, the Worker's date gate, puzzle fetch/cache,
                     # guess matching, viewfinder geometry, suggestions, share text, storage and streaks
npm run test:e2e     # Playwright: plays the game to a win and a loss, offline, theming, axe accessibility
```

## Deploy

```sh
npm run deploy       # build, then wrangler deploy to https://closecall.jonstuebe.com
```

One Cloudflare Worker serves the static site and `GET /api/puzzle/<YYYY-MM-DD>`, which returns `{ number, puzzle }` only while that date is "today" somewhere on Earth (UTC−12 to UTC+14). Every other date gets a 404.

## Content

Puzzles live in `worker/puzzles.json` and never ship in the client bundle. Add one with:

```sh
npm run photos -- --image ~/shots/otter.jpg --answer otter \
  --accept "sea otter,river otter" --focus 0.4,0.55 \
  --credit "Otter by A. Photographer (CC BY 2.0)" \
  --url https://example.org/photo --license "CC BY 2.0" \
  --fact "Sea otters hold hands while they sleep."
```

To find photos worth adding, `npm run find-photos` (or `npm run find-photos -- otter heron`) searches Wikimedia Commons' Quality images of animals, at least 2000px wide, and writes a contact sheet to `photo-candidates/index.html`. Each photo there comes with its credit and licence filled into a copyable `npm run photos` command. A photo makes the sheet when its structured-data "depicts" tag is the animal (or a species or breed of it), or, if it has no animal tags at all, when the animal is named in its title or categories; check those "named" ones closer. Which taxa count as which animal is `scripts/photo-taxa.json`.

`npm run photos` strips the photo's metadata, caps its longest edge at 1600px, writes it to `public/photos/<hash>.jpg`, appends the puzzle and adds a `docs/sources.csv` row. Check the first frame with `npm run dev`, or review a whole batch with `npm run review` (http://127.0.0.1:4319): it steps each Puzzle through its zooms in the real viewfinder framing, and Approve/Reject marks its `docs/sources.csv` row `verified` or `rejected`. Then commit and `npm run deploy`. The build warns when fewer than 14 puzzles are left after today.

- Puzzle number = days since `LAUNCH_DATE` in `worker/puzzles.ts` (puzzle #1 on launch day). When the list runs out, players see "Back tomorrow"; it never loops.
- `accept` is matched after normalization (lowercase, unaccented, leading article dropped) with a plural tolerance, so list genuine alternative names, not spelling variants.
- `focus` is where the viewfinder stays pinned as it zooms, as a 0..1 fraction from the photo's top left. Tune it so the first frame is hard but fair.
- `zooms` must be six factors, strictly decreasing, ending at `1` — the whole photo on the last try.
- `fact` is the in-app "Did you know?" card; it never appears in the share text.
- Every photo's source and licence is tracked in `docs/sources.csv` (not shipped with the app); `photo.credit` is shown to the player on the reveal.
- `src/lib/animals.ts` is the autocomplete vocabulary. It ships to the client on purpose: it's the same every day, so it gives nothing away, and an answer need not appear in it.

## Structure

```
worker/
  index.ts           GET /api/puzzle/:date with the "today somewhere" gate
  puzzles.ts         launch date, puzzle number, date window
  puzzles.json       every puzzle (server only)
src/
  lib/daily.ts       fetch today's puzzle, cache it for offline play
  lib/puzzle.ts      local date key, DST-safe day maths, next midnight
  lib/guessing.ts    normalization, accept matching, the zoom ladder
  lib/viewfinder.ts  where the photo sits in the square frame at a given zoom
  lib/suggest.ts     autocomplete over src/lib/animals.ts
  lib/share.ts       share text + Web Share API / clipboard fallback
  lib/storage.ts     versioned localStorage, streaks, stats
  lib/pwa.ts         service worker registration + update prompt
  components/        Game, Viewfinder, ZoomScale, GuessForm, Result, modals, toasts
public/photos/       content-hashed puzzle photos (add with `npm run photos`)
public/icons/        PWA icons (regenerate with `npm run icons`)
```
