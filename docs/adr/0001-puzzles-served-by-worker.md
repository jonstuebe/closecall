# Puzzles are served one day at a time by the Worker

If `puzzles.json` shipped inside the client bundle, anyone could view source and read every future answer, and the bundle would grow with every Puzzle added. Instead it lives in the Cloudflare Worker, which serves `GET /api/puzzle/<YYYY-MM-DD>` only for a date that is "today" somewhere on Earth (UTC−12 to UTC+14) and returns `{ number, puzzle }`. Players must be online once per day; the Puzzle they fetch is cached in `localStorage` so play in progress still works offline.

## Considered Options

- **Bundle every Puzzle:** leaks every future answer and grows the bundle without bound.
- **Serve any scheduled date, as NYT's Wordle endpoint does:** answers weeks out would be fetchable, which leaks exactly what we wanted to hide.
- **Server-side guess checking:** would also hide *today's* answer, but costs all offline play and a round-trip per Try. We only hide future Puzzles; today's answer reaching DevTools is accepted, as it is for Wordle.
- **KV, D1 or a Durable Object:** the data is read-only and keyed by date, so storage adds cost and moving parts. Puzzles stay in git next to `docs/sources.csv` and publish with `npm run deploy`.

## Consequences

- The Puzzle number and Launch date live only on the server; the client asks for its local date.
- When the Puzzles run out the server returns 404 and the app shows "Back tomorrow" instead of looping, since a looped Puzzle's answer is already public. `npm run deploy` warns when fewer than 14 Puzzles remain.
- Only today's Puzzle is served; there is no archive endpoint.
