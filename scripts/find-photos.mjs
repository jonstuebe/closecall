// Finds candidate Photos on Wikimedia Commons, to pick from for `npm run photos`.
//
//   npm run find-photos                  every animal in src/lib/animals.ts
//   npm run find-photos -- otter heron   just these
//   npm run find-photos -- --limit 80    search hits looked at per animal (default 40)
//
// Searches Commons' Quality images of animals at least 2000px wide, keeps the
// photos whose "depicts" tags (or, untagged, whose title or categories) show the
// right animal, and writes a contact sheet to photo-candidates/index.html: each
// photo with its credit, licence and a ready-to-run `npm run photos` command.
// Which taxa count as which animal lives in scripts/photo-taxa.json.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { ANIMALS } from '../src/lib/animals.ts';

const TAXA = JSON.parse(await readFile(new URL('./photo-taxa.json', import.meta.url), 'utf8'));
const SOURCES = new URL('../docs/sources.csv', import.meta.url);
const OUT = new URL('../photo-candidates/', import.meta.url);

const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const SPARQL = 'https://query.wikidata.org/sparql';
// Wikimedia asks every client to identify itself: https://meta.wikimedia.org/wiki/User-Agent_policy
const USER_AGENT = 'CloseCall/1.0 (https://github.com/jonstuebe/closecall)';

/** Wide enough to stay sharp at the deepest zoom once capped to 1600px. */
const MIN_WIDTH = 2000;
const POOL = `deepcat:"Quality images of animals" filew:>${MIN_WIDTH} filetype:bitmap`;
const ANIMALIA = 'Q729';
/** Species and breeds searched by depicts tag per animal, besides its own taxa. */
const DESCENDANTS = 36;
/** Commons rejects search queries over 300 characters; this many depicts terms fit. */
const DEPICTS_PER_SEARCH = 8;

const args = parseArgs(process.argv.slice(2));
const animals = args.animals.length ? args.animals : [...ANIMALS];
for (const animal of animals) if (!TAXA[animal]) fail(`No taxa for "${animal}" in scripts/photo-taxa.json`);

const used = await usedPhotos();
const targets = await resolveTaxa(animals);
const ancestors = new Map(); // Wikidata item → every taxon and class above it, itself included

const found = {};
for (const animal of animals) {
  found[animal] = await candidatesFor(animal, targets[animal], args.limit);
  const tagged = found[animal].filter((c) => c.match === 'depicts').length;
  console.log(`${animal.padEnd(12)} ${String(found[animal].length).padStart(3)} (${tagged} by depicts tag)`);
}

await mkdir(OUT, { recursive: true });
await writeFile(new URL('candidates.json', OUT), `${JSON.stringify(found, null, 2)}\n`);
await writeFile(new URL('index.html', OUT), contactSheet(found));
const total = Object.values(found).reduce((n, list) => n + list.length, 0);
console.log(`${total} candidates for ${animals.length} animals → photo-candidates/index.html`);

/** Each animal's taxa as Wikidata items. Names resolve to the best-known item carrying that taxon name. */
async function resolveTaxa(names) {
  const scientific = [...new Set(names.flatMap((a) => TAXA[a]).filter((t) => !isItem(t)))];
  const rows = await sparql(`SELECT ?name ?item ?links WHERE {
    VALUES ?name { ${scientific.map((n) => JSON.stringify(n)).join(' ')} }
    ?item wdt:P225 ?name ; wikibase:sitelinks ?links .
  }`);
  // Taxon names collide across kingdoms (Anura is also a daisy): the real one has the most sitelinks.
  const best = new Map();
  for (const row of rows) {
    const links = Number(row.links.value);
    if (!best.has(row.name.value) || links > best.get(row.name.value).links) best.set(row.name.value, { item: itemId(row.item), links });
  }
  const out = {};
  for (const animal of names) {
    out[animal] = TAXA[animal].map((t) => (isItem(t) ? t : best.get(t)?.item)).filter(Boolean);
    const missing = TAXA[animal].filter((t) => !isItem(t) && !best.has(t));
    if (missing.length) console.warn(`  ${animal}: no Wikidata taxon named ${missing.join(', ')}`);
  }
  return out;
}

async function candidatesFor(animal, taxa, limit) {
  // A depicts tag names the exact species or breed, not the family above it, so search those too.
  const tagged = [];
  for (const batch of chunks(dedupe([...taxa, ...(await notableDescendants(taxa))]), DEPICTS_PER_SEARCH)) {
    tagged.push(...(await search(`haswbstatement:${batch.map((q) => `P180=${q}`).join('|')} ${POOL}`, limit)));
  }
  const ids = dedupe([...tagged, ...(await search(`"${animal}" ${POOL}`, limit))]);
  const [pages, depicts] = await Promise.all([pageInfo(ids), depictsOf(ids)]);
  await learnAncestors([...new Set([...depicts.values()].flat())]);

  const names = [animal, ...TAXA[animal].filter((t) => !isItem(t))].map((n) => new RegExp(`\\b${escapeRegExp(n)}e?s?\\b`, 'i'));
  const out = [];
  for (const id of ids) {
    const page = pages.get(id);
    const info = page?.imageinfo?.[0];
    if (!info || used.has(info.descriptionurl)) continue;
    const match = classify(depicts.get(id) ?? [], taxa, [page.title, ...(page.categories ?? []).map((c) => c.title)], names);
    if (match) out.push(candidate(animal, id, page.title, info, match));
  }
  return out;
}

/**
 * How we know the photo shows the animal, or null if we don't: a depicts tag
 * on it or below it in the tree of life, else (when nothing tagged is an animal
 * at all) its name in the file's title or categories.
 */
function classify(depicted, taxa, labels, names) {
  const lines = depicted.map((q) => ancestors.get(q) ?? new Set([q]));
  if (lines.some((line) => taxa.some((t) => line.has(t)))) return 'depicts';
  if (lines.some((line) => line.has(ANIMALIA))) return null; // tagged as some other animal
  return labels.some((label) => names.some((re) => re.test(label.replace(/^(File|Category):/, '')))) ? 'named' : null;
}

function candidate(animal, id, title, info, match) {
  const meta = info.extmetadata ?? {};
  const artist = plainText(meta.Artist?.value) || 'Unknown author';
  const license = plainText(meta.LicenseShortName?.value) || 'see source';
  const credit = `${animal[0].toUpperCase()}${animal.slice(1)} by ${artist} (${license})`;
  const local = `/tmp/closecall-${id}${info.url.match(/\.\w+$/)?.[0] ?? '.jpg'}`;
  return {
    match,
    title: title.replace(/^File:/, ''),
    width: info.width,
    height: info.height,
    thumb: info.thumburl,
    image: info.url,
    source: info.descriptionurl,
    artist,
    license,
    restrictions: plainText(meta.Restrictions?.value),
    credit,
    command:
      `curl -sL -A ${sh(USER_AGENT)} -o ${local} ${sh(info.url)} && ` +
      `npm run photos -- --image ${local} --answer ${sh(animal)} --credit ${sh(credit)} --url ${sh(info.descriptionurl)} --license ${sh(license)}`,
  };
}

async function search(query, limit) {
  const body = await commons({ action: 'query', list: 'search', srnamespace: 6, srsearch: query, srlimit: limit, srprop: '' });
  return body.query.search.map((hit) => hit.pageid);
}

/** Title, original URL, size, licence metadata and visible categories per file page. */
async function pageInfo(ids) {
  const pages = new Map();
  for (const batch of chunks(ids, 50)) {
    let more = {};
    do {
      const body = await commons({
        action: 'query',
        pageids: batch.join('|'),
        prop: 'imageinfo|categories',
        iiprop: 'url|size|extmetadata',
        iiurlwidth: 480,
        iiextmetadatafilter: 'Artist|LicenseShortName|Restrictions',
        clshow: '!hidden',
        cllimit: 'max',
        ...more,
      });
      for (const page of body.query?.pages ?? []) {
        const seen = pages.get(page.pageid) ?? { title: page.title, categories: [] };
        seen.imageinfo ??= page.imageinfo;
        seen.categories.push(...(page.categories ?? []));
        pages.set(page.pageid, seen);
      }
      more = body.continue ?? null;
    } while (more);
  }
  return pages;
}

/** The Wikidata items each file's structured data says it depicts. */
async function depictsOf(ids) {
  const out = new Map();
  for (const batch of chunks(ids, 50)) {
    const body = await commons({ action: 'wbgetentities', ids: batch.map((id) => `M${id}`).join('|'), props: 'claims' });
    for (const entity of Object.values(body.entities ?? {})) {
      const claims = entity.statements ?? entity.claims ?? {};
      const items = (claims.P180 ?? []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
      out.set(Number(entity.id.slice(1)), items);
    }
  }
  return out;
}

/**
 * The best-known species and breeds up to two levels below each taxon, by
 * sitelinks. One query per taxon: asking for several at once times out on big
 * ones like beetles.
 */
async function notableDescendants(taxa) {
  const each = Math.max(4, Math.floor(DESCENDANTS / taxa.length));
  const out = [];
  for (const taxon of taxa) {
    const rows = await sparql(`SELECT ?below (MAX(?links) AS ?most) WHERE {
      ?below (wdt:P171|wdt:P279)/(wdt:P171|wdt:P279)? wd:${taxon} ; wikibase:sitelinks ?links .
    } GROUP BY ?below ORDER BY DESC(?most) LIMIT ${each}`);
    out.push(...rows.map((row) => itemId(row.below)));
  }
  return out;
}

/** Fills `ancestors` for items not yet seen: their parent taxa (P171) and superclasses (P279, for breeds). */
async function learnAncestors(items) {
  for (const batch of chunks(items.filter((q) => !ancestors.has(q)), 100)) {
    for (const q of batch) ancestors.set(q, new Set([q]));
    const rows = await sparql(`SELECT ?item ?above WHERE {
      VALUES ?item { ${batch.map((q) => `wd:${q}`).join(' ')} }
      ?item (wdt:P171|wdt:P279)* ?above . hint:Prior hint:gearing "forward" .
    }`);
    for (const row of rows) ancestors.get(itemId(row.item)).add(itemId(row.above));
  }
}

/** Commons URLs already credited in docs/sources.csv, so a photo isn't offered twice. */
async function usedPhotos() {
  const csv = await readFile(SOURCES, 'utf8');
  return new Set(csv.match(/https:\/\/commons\.wikimedia\.org\/wiki\/File:[^,\s"]+/g) ?? []);
}

function commons(params) {
  const url = new URL(COMMONS);
  for (const [key, value] of Object.entries({ format: 'json', formatversion: 2, maxlag: 5, ...params })) url.searchParams.set(key, value);
  return getJson(url);
}

async function sparql(query) {
  const body = await getJson(SPARQL, {
    method: 'POST',
    headers: { Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ query }),
  });
  return body.results.bindings;
}

/** Fetches JSON politely: one request at a time, backing off when Wikimedia is busy. */
async function getJson(url, init = {}) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { ...init, headers: { 'User-Agent': USER_AGENT, ...init.headers } });
    const body = res.ok ? await res.json().catch(() => null) : null;
    if (body && body.error?.code !== 'maxlag') {
      if (body.error) fail(`Commons said: ${body.error.info}`);
      return body;
    }
    if (attempt === 5) fail(`Gave up on ${new URL(url).host} after ${attempt} tries (HTTP ${res.status}).`);
    const wait = Number(res.headers.get('retry-after')) || 2 ** attempt;
    await new Promise((resolve) => setTimeout(resolve, wait * 1000));
  }
}

function contactSheet(byAnimal) {
  const sections = Object.entries(byAnimal).map(([animal, list]) => `
    <section>
      <h2>${esc(animal)} <small>${list.length}</small></h2>
      ${list.length ? '' : '<p class="none">Nothing found.</p>'}
      <div class="grid">${list.map(card).join('')}</div>
    </section>`);
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Photo candidates</title>
<style>
  :root { color-scheme: light dark; --bg: #fafaf9; --fg: #1c1917; --muted: #78716c; --card: #fff; --line: #e7e5e4; --tag: #dcfce7; --tag-fg: #166534; }
  @media (prefers-color-scheme: dark) { :root { --bg: #1c1917; --fg: #f5f5f4; --muted: #a8a29e; --card: #292524; --line: #44403c; --tag: #14532d; --tag-fg: #bbf7d0; } }
  body { margin: 0; padding: 24px 16px; background: var(--bg); color: var(--fg); font: 14px/1.45 system-ui, sans-serif; }
  h1 { margin: 0 0 4px; } header p, small, .meta, .none { color: var(--muted); }
  h2 { margin: 32px 0 12px; text-transform: capitalize; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
  article { background: var(--card); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; }
  img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block; background: var(--line); }
  .body { padding: 10px 12px 12px; display: grid; gap: 6px; }
  .title { font-weight: 600; overflow-wrap: anywhere; }
  .tag { justify-self: start; padding: 1px 8px; border-radius: 99px; font-size: 12px; background: var(--line); }
  .tag.depicts { background: var(--tag); color: var(--tag-fg); }
  .warn { color: #b45309; }
  button { justify-self: start; font: inherit; padding: 4px 10px; border-radius: 6px; border: 1px solid var(--line); background: var(--bg); color: inherit; cursor: pointer; }
  a { color: inherit; }
</style>
<header>
  <h1>Photo candidates</h1>
  <p>Quality images of animals on Wikimedia Commons, at least ${MIN_WIDTH}px wide. “depicts” means a structured-data tag confirms the animal; “named” means only the title or a category does, so look closer. Copy a command to download the photo and add it as a Puzzle, then add --accept, --focus and --fact.</p>
</header>
${sections.join('')}
<script>
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-command]');
    if (!button) return;
    await navigator.clipboard.writeText(button.dataset.command);
    button.textContent = 'Copied';
    setTimeout(() => (button.textContent = 'Copy command'), 1500);
  });
</script>
</html>
`;
}

function card(c) {
  return `
    <article>
      <a href="${esc(c.source)}" target="_blank" rel="noopener"><img src="${esc(c.thumb)}" alt="" loading="lazy"></a>
      <div class="body">
        <span class="tag ${c.match}">${c.match}</span>
        <span class="title">${esc(c.title)}</span>
        <span class="meta">${c.width}×${c.height} · ${esc(c.license)} · ${esc(c.artist)}</span>
        ${c.restrictions ? `<span class="warn">Restrictions: ${esc(c.restrictions)}</span>` : ''}
        <button type="button" data-command="${esc(c.command)}">Copy command</button>
      </div>
    </article>`;
}

/** Commons metadata comes as HTML; credits and licences want plain text. */
function plainText(html = '') {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function esc(text) {
  return String(text).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
}

/** Quotes a value for a POSIX shell. */
function sh(text) {
  return `'${String(text).replace(/'/g, `'\\''`)}'`;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isItem(taxon) {
  return /^Q\d+$/.test(taxon);
}

function itemId(binding) {
  return binding.value.split('/').pop();
}

function chunks(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function dedupe(items) {
  return [...new Set(items)];
}

function parseArgs(argv) {
  const out = { animals: [], limit: 40 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--limit') {
      out.limit = Number(argv[++i]);
      if (!Number.isInteger(out.limit) || out.limit < 1 || out.limit > 500) fail('--limit needs a whole number from 1 to 500');
    } else if (argv[i].startsWith('--')) {
      fail(`Unknown flag ${argv[i]}`);
    } else {
      out.animals.push(argv[i].toLowerCase().trim());
    }
  }
  return out;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
