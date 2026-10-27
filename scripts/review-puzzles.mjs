// A local page for approving new Puzzles before they ship.
//
//   npm run review                 http://127.0.0.1:4319
//   npm run review -- --port 5000
//
// Shows each Puzzle through the same viewfinder framing the game uses, at every
// zoom step, with its answer, accepted guesses, fact, credit and licence.
// Approving marks its docs/sources.csv row "verified", rejecting marks it
// "rejected"; notes go to photo-candidates/review-notes.json.
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';

const PUZZLES = new URL('../worker/puzzles.json', import.meta.url);
const SOURCES = new URL('../docs/sources.csv', import.meta.url);
const PHOTOS = new URL('../public/photos/', import.meta.url);
const NOTES = new URL('../photo-candidates/review-notes.json', import.meta.url);
const WORKER = new URL('../worker/puzzles.ts', import.meta.url);

const STATUSES = new Set(['verified', 'rejected', 'unverified']);
const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

const portFlag = process.argv.indexOf('--port');
const port = portFlag > -1 ? Number(process.argv[portFlag + 1]) : 4319;
const launch = (await readFile(WORKER, 'utf8')).match(/LAUNCH_DATE = '([\d-]+)'/)?.[1];

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/') return send(res, 200, 'text/html; charset=utf-8', PAGE);
    if (req.method === 'GET' && url.pathname === '/api/puzzles') return json(res, 200, await reviewState());
    if (req.method === 'GET' && url.pathname.startsWith('/photos/')) {
      const file = url.pathname.slice('/photos/'.length);
      if (!/^[0-9a-f]{16}\.\w+$/.test(file)) return send(res, 404, 'text/plain', 'Not found');
      return send(res, 200, TYPES[extname(file)] ?? 'application/octet-stream', await readFile(new URL(file, PHOTOS)));
    }
    if (req.method === 'POST' && url.pathname === '/api/decision') {
      const { id, status, note } = JSON.parse(await body(req));
      if (!Number.isInteger(id) || !STATUSES.has(status)) return json(res, 400, { error: 'Needs an id and a status' });
      await setStatus(id, status);
      await setNote(id, note);
      return json(res, 200, await reviewState());
    }
    send(res, 404, 'text/plain', 'Not found');
  } catch (error) {
    json(res, 500, { error: String(error.message ?? error) });
  }
}).listen(port, '127.0.0.1', () => console.log(`Reviewing Puzzles at http://127.0.0.1:${port}`));

/** Every Puzzle with its sources row and any note, in play order. */
async function reviewState() {
  const puzzles = JSON.parse(await readFile(PUZZLES, 'utf8'));
  const rows = sourceRows(await readFile(SOURCES, 'utf8'));
  const notes = await readNotes();
  return {
    launch,
    puzzles: puzzles.map((p) => ({ ...p, source: rows.get(p.id) ?? null, note: notes[p.id] ?? '' })),
  };
}

/** docs/sources.csv rows by Puzzle id. Credits can hold commas, so quoted fields are kept whole. */
function sourceRows(csv) {
  const rows = new Map();
  for (const line of csv.trim().split('\n').slice(1)) {
    // Commons URLs can carry unquoted commas, so the URL is whatever sits between credit and licence.
    const fields = csvFields(line);
    const [id, answer, file, credit] = fields;
    const [license, verified] = fields.slice(-2);
    rows.set(Number(id), { answer, file, credit, url: fields.slice(4, -2).join(','), license, verified });
  }
  return rows;
}

function csvFields(line) {
  return [...line.matchAll(/(?:^|,)(?:"((?:[^"]|"")*)"|([^,]*))/g)].map((m) => (m[1] ?? m[2]).replace(/""/g, '"'));
}

/** Rewrites only the last field (verified) of that Puzzle's row, leaving the rest byte for byte. */
async function setStatus(id, status) {
  const lines = (await readFile(SOURCES, 'utf8')).split('\n');
  const index = lines.findIndex((line, i) => i > 0 && line.startsWith(`${id},`));
  if (index === -1) throw new Error(`No docs/sources.csv row for Puzzle #${id}`);
  lines[index] = lines[index].replace(/,[a-z]*$/, `,${status}`);
  await writeFile(SOURCES, lines.join('\n'));
}

async function readNotes() {
  try {
    return JSON.parse(await readFile(NOTES, 'utf8'));
  } catch {
    return {};
  }
}

async function setNote(id, note) {
  const notes = await readNotes();
  if (note?.trim()) notes[id] = note.trim();
  else delete notes[id];
  await mkdir(new URL('.', NOTES), { recursive: true });
  await writeFile(NOTES, `${JSON.stringify(notes, null, 2)}\n`);
}

function body(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function json(res, code, value) {
  send(res, code, 'application/json', JSON.stringify(value));
}

function send(res, code, type, content) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(content);
}

const PAGE = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Puzzle review</title>
<style>
  :root { color-scheme: light dark; --bg: #f5f5f4; --fg: #1c1917; --muted: #78716c; --card: #fff; --line: #e7e5e4;
    --ok: #15803d; --ok-bg: #dcfce7; --no: #b91c1c; --no-bg: #fee2e2; --accent: #1c1917; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0c0a09; --fg: #f5f5f4; --muted: #a8a29e; --card: #1c1917; --line: #292524;
    --ok: #4ade80; --ok-bg: #052e16; --no: #f87171; --no-bg: #450a0a; --accent: #f5f5f4; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 14px/1.5 system-ui, sans-serif; }
  .app { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
  nav { border-right: 1px solid var(--line); padding: 16px 0; overflow-y: auto; max-height: 100vh; position: sticky; top: 0; }
  nav h1 { font-size: 15px; margin: 0 16px 4px; }
  nav .progress { margin: 0 16px 12px; color: var(--muted); }
  nav .filters { display: flex; gap: 6px; margin: 0 16px 12px; }
  nav button.item { display: flex; width: 100%; gap: 8px; align-items: center; padding: 6px 16px; border: 0; background: none;
    color: inherit; font: inherit; text-align: left; cursor: pointer; }
  nav button.item[aria-current="true"] { background: var(--line); }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--line); flex: none; }
  .dot.verified { background: var(--ok); } .dot.rejected { background: var(--no); }
  nav .num { color: var(--muted); width: 28px; flex: none; }
  main { padding: 24px; display: grid; grid-template-columns: minmax(280px, 480px) minmax(260px, 1fr); gap: 28px; align-items: start; }
  .finder { position: relative; width: 100%; aspect-ratio: 1; overflow: hidden; border-radius: 14px; background: #000; }
  .finder img { position: absolute; left: 0; top: 0; transform-origin: 0 0; max-width: none; }
  .finder .zoom { position: absolute; right: 10px; top: 10px; background: rgb(0 0 0 / .6); color: #fff; padding: 2px 8px; border-radius: 99px; font-variant-numeric: tabular-nums; }
  .steps { display: flex; gap: 6px; margin-top: 12px; flex-wrap: wrap; }
  button.chip { font: inherit; padding: 4px 12px; border-radius: 99px; border: 1px solid var(--line); background: var(--card); color: inherit; cursor: pointer; }
  button.chip[aria-pressed="true"] { background: var(--accent); color: var(--bg); border-color: var(--accent); }
  .details h2 { margin: 0; font-size: 26px; text-transform: capitalize; }
  .meta { color: var(--muted); margin: 2px 0 16px; }
  dl { display: grid; grid-template-columns: 88px 1fr; gap: 8px 12px; margin: 0 0 20px; }
  dt { color: var(--muted); } dd { margin: 0; overflow-wrap: anywhere; }
  .accept span { display: inline-block; padding: 0 8px; margin: 0 4px 4px 0; border-radius: 6px; background: var(--line); }
  textarea { width: 100%; min-height: 64px; font: inherit; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--line); background: var(--card); color: inherit; }
  .actions { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; align-items: center; }
  .actions button { font: inherit; font-weight: 600; padding: 8px 16px; border-radius: 8px; border: 1px solid transparent; cursor: pointer; }
  .approve { background: var(--ok-bg); color: var(--ok); } .reject { background: var(--no-bg); color: var(--no); }
  .reset { background: none; color: var(--muted); border-color: var(--line) !important; }
  .status { font-weight: 600; } .status.verified { color: var(--ok); } .status.rejected { color: var(--no); }
  .keys { color: var(--muted); font-size: 12px; margin-top: 16px; }
  kbd { font: 11px ui-monospace, monospace; padding: 1px 5px; border: 1px solid var(--line); border-radius: 4px; }
  a { color: inherit; }
  @media (max-width: 760px) { .app { grid-template-columns: 1fr; } nav { position: static; max-height: 40vh; border-right: 0; border-bottom: 1px solid var(--line); } main { grid-template-columns: 1fr; padding: 16px; } }
</style>
<div class="app">
  <nav>
    <h1>Puzzle review</h1>
    <div class="progress" id="progress"></div>
    <div class="filters">
      <button class="chip" data-filter="todo" aria-pressed="true">To review</button>
      <button class="chip" data-filter="all" aria-pressed="false">All</button>
    </div>
    <div id="list"></div>
  </nav>
  <main id="main"></main>
</div>
<script>
  let state = { puzzles: [] }, current = null, step = 0, filter = 'todo';
  const status = (p) => p.source?.verified ?? 'unverified';
  const done = (p) => status(p) !== 'unverified';
  const visible = () => state.puzzles.filter((p) => filter === 'all' || !done(p));
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // Same placement as src/lib/viewfinder.ts: cover the square, magnify about the focus, never show an edge.
  function frame(size, photo, focus, zoom) {
    const aspect = photo.width / photo.height;
    const width = aspect >= 1 ? size * aspect : size, height = aspect >= 1 ? size : size / aspect;
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    return { width, height, x: clamp(size / 2 - focus.x * width * zoom, size - width * zoom, 0), y: clamp(size / 2 - focus.y * height * zoom, size - height * zoom, 0) };
  }

  function dateOf(id) {
    if (!state.launch) return '';
    const d = new Date(state.launch + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + id - 1);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  }

  function renderList() {
    const counts = { verified: 0, rejected: 0 };
    state.puzzles.forEach((p) => counts[status(p)] !== undefined && counts[status(p)]++);
    document.getElementById('progress').textContent = counts.verified + ' approved · ' + counts.rejected + ' rejected · ' + state.puzzles.filter((p) => !done(p)).length + ' to go';
    document.getElementById('list').innerHTML = visible().map((p) =>
      '<button class="item" data-id="' + p.id + '" aria-current="' + (p.id === current) + '"><span class="dot ' + status(p) + '"></span><span class="num">#' + p.id + '</span>' + esc(p.answer) + '</button>').join('');
  }

  function renderMain() {
    const p = state.puzzles.find((x) => x.id === current);
    const main = document.getElementById('main');
    if (!p) { main.innerHTML = '<p>Nothing left to review. Switch to <b>All</b> to look again.</p>'; return; }
    const s = status(p);
    main.innerHTML = \`
      <div>
        <div class="finder" id="finder"><img id="photo" src="/photos/\${esc(p.photo.file)}" alt=""><span class="zoom" id="zoom"></span></div>
        <div class="steps">\${p.zooms.map((z, i) => '<button class="chip" data-step="' + i + '" aria-pressed="' + (i === step) + '">Try ' + (i + 1) + ' · ' + z + '×</button>').join('')}</div>
      </div>
      <div class="details">
        <h2>\${esc(p.display)}</h2>
        <div class="meta">Puzzle #\${p.id} · \${dateOf(p.id)} · <span class="status \${s}">\${s}</span></div>
        <dl>
          <dt>Accepts</dt><dd class="accept">\${p.accept.map((a) => '<span>' + esc(a) + '</span>').join('')}</dd>
          <dt>Fact</dt><dd>\${esc(p.fact ?? '—')}</dd>
          <dt>Credit</dt><dd>\${esc(p.photo.credit)}</dd>
          <dt>Licence</dt><dd>\${esc(p.source?.license || '—')}</dd>
          <dt>Source</dt><dd>\${p.source?.url ? '<a href="' + esc(p.source.url) + '" target="_blank" rel="noopener">' + esc(decodeURIComponent(p.source.url.split('/').pop())) + '</a>' : '—'}</dd>
          <dt>Photo</dt><dd>\${p.photo.width}×\${p.photo.height} · focus \${p.focus.x}, \${p.focus.y}</dd>
        </dl>
        <label for="note">Note (what to change, if anything)</label>
        <textarea id="note" placeholder="e.g. first frame too easy, or accept 'puma' too">\${esc(p.note)}</textarea>
        <div class="actions">
          <button class="approve" data-decide="verified">Approve</button>
          <button class="reject" data-decide="rejected">Reject</button>
          \${s !== 'unverified' ? '<button class="reset" data-decide="unverified">Undo</button>' : ''}
        </div>
        <div class="keys"><kbd>←</kbd><kbd>→</kbd> zoom · <kbd>A</kbd> approve · <kbd>R</kbd> reject · <kbd>J</kbd><kbd>K</kbd> next / previous</div>
      </div>\`;
    placePhoto();
  }

  function placePhoto() {
    const p = state.puzzles.find((x) => x.id === current);
    const finder = document.getElementById('finder');
    if (!p || !finder) return;
    const size = finder.clientWidth, zoom = p.zooms[step];
    const f = frame(size, p.photo, p.focus, zoom);
    const img = document.getElementById('photo');
    img.style.width = f.width + 'px';
    img.style.height = f.height + 'px';
    img.style.transform = 'translate(' + f.x + 'px,' + f.y + 'px) scale(' + zoom + ')';
    document.getElementById('zoom').textContent = (Number.isInteger(zoom) ? zoom : zoom.toFixed(1)) + '×';
    document.querySelectorAll('[data-step]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.step) === step)));
  }

  function select(id) { current = id; step = 0; renderList(); renderMain(); }

  function move(delta) {
    const list = visible().length ? visible() : state.puzzles;
    const i = list.findIndex((p) => p.id === current);
    const next = list[Math.min(list.length - 1, Math.max(0, (i === -1 ? 0 : i + delta)))];
    if (next) select(next.id);
  }

  async function decide(verdict) {
    const p = state.puzzles.find((x) => x.id === current);
    if (!p) return;
    const note = document.getElementById('note')?.value ?? '';
    const before = visible().map((x) => x.id);
    const res = await fetch('/api/decision', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, status: verdict, note }) });
    const body = await res.json();
    if (!res.ok) return alert(body.error);
    state = body;
    // Move on to the next one still to review, in play order.
    const after = before.slice(before.indexOf(p.id) + 1).concat(before.slice(0, before.indexOf(p.id)));
    const next = verdict === 'unverified' ? p.id : after.find((id) => !done(state.puzzles.find((x) => x.id === id))) ?? p.id;
    select(next);
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.id) select(Number(t.dataset.id));
    else if (t.dataset.step) { step = Number(t.dataset.step); placePhoto(); }
    else if (t.dataset.decide) decide(t.dataset.decide);
    else if (t.dataset.filter) {
      filter = t.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === t)));
      renderList();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'TEXTAREA') return;
    const p = state.puzzles.find((x) => x.id === current);
    if (e.key === 'ArrowRight' && p) { step = Math.min(p.zooms.length - 1, step + 1); placePhoto(); }
    else if (e.key === 'ArrowLeft') { step = Math.max(0, step - 1); placePhoto(); }
    else if (e.key === 'a') decide('verified');
    else if (e.key === 'r') decide('rejected');
    else if (e.key === 'j') move(1);
    else if (e.key === 'k') move(-1);
  });

  addEventListener('resize', placePhoto);

  fetch('/api/puzzles').then((r) => r.json()).then((s) => {
    state = s;
    select((visible()[0] ?? state.puzzles[0])?.id ?? null);
  });
</script>
</html>
`;
