// Adds a Puzzle to worker/puzzles.json and its photo to public/photos/.
//
//   npm run photos -- --image ~/shots/otter.jpg --answer otter \
//     --accept "otter,sea otter,river otter" --focus 0.4,0.55 \
//     --credit "Otter by A. Photographer (CC BY 2.0)" \
//     --fact "Sea otters hold hands while they sleep."
//
// --zooms defaults to a six-step ladder ending at the whole photo. Tune --focus
// (0..1 of the photo, from the top left) so the first frame is a hard but fair crop.
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const PUZZLES = new URL('../worker/puzzles.json', import.meta.url);
const PHOTOS = new URL('../public/photos/', import.meta.url);
const SOURCES = new URL('../docs/sources.csv', import.meta.url);

/** Longest edge in the shipped photo: enough to stay sharp at the deepest zoom. */
const MAX_EDGE = 1600;
const DEFAULT_ZOOMS = [8, 5.5, 3.8, 2.6, 1.7, 1];

const args = parseArgs(process.argv.slice(2));
for (const required of ['image', 'answer', 'credit']) {
  if (!args[required]) fail(`Missing --${required}`);
}

const answer = args.answer.toLowerCase().trim();
const accept = dedupe([answer, ...(args.accept ?? '').split(',').map((s) => s.toLowerCase().trim()).filter(Boolean)]);
const zooms = args.zooms ? args.zooms.split(',').map(Number) : DEFAULT_ZOOMS;
if (zooms.length !== 6 || zooms.some((z) => !Number.isFinite(z))) fail('--zooms needs six numbers, e.g. 8,5.5,3.8,2.6,1.7,1');
if (zooms.at(-1) !== 1) fail('The last zoom must be 1: the final try always shows the whole photo.');
if (zooms.some((z, i) => i > 0 && z >= zooms[i - 1])) fail('--zooms must get smaller every step.');

const [fx, fy] = (args.focus ?? '0.5,0.5').split(',').map(Number);
if (![fx, fy].every((n) => n >= 0 && n <= 1)) fail('--focus needs two fractions between 0 and 1, e.g. 0.4,0.55');

// Strip metadata (a filename or GPS tag would give it away) and cap the size.
const source = await readFile(args.image.replace(/^~/, process.env.HOME ?? '~'));
const processed = await sharp(source)
  .rotate()
  .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
  .jpeg({ quality: 86, mozjpeg: true })
  .toBuffer();
const { width, height } = await sharp(processed).metadata();

// Content-hashed, so nothing in the filename hints at the answer and nobody can
// guess tomorrow's URL.
const file = `${createHash('sha256').update(processed).digest('hex').slice(0, 16)}.jpg`;
await writeFile(new URL(file, PHOTOS), processed);

const puzzles = JSON.parse(await readFile(PUZZLES, 'utf8'));
if (puzzles.some((p) => p.photo.file === file)) fail('That exact photo is already in worker/puzzles.json.');

const puzzle = {
  id: puzzles.length + 1,
  answer,
  display: args.display ?? `${/^[aeiou]/.test(answer) ? 'an' : 'a'} ${answer}`,
  accept,
  photo: { file, width, height, credit: args.credit },
  focus: { x: fx, y: fy },
  zooms,
  ...(args.fact ? { fact: args.fact } : {}),
};
puzzles.push(puzzle);
await writeFile(PUZZLES, `${JSON.stringify(puzzles, null, 2)}\n`);

const sources = await readFile(SOURCES, 'utf8');
await writeFile(SOURCES, `${sources.trimEnd()}\n${puzzle.id},${answer},${file},"${args.credit}",${args.url ?? ''},"${args.license ?? ''}",unverified\n`);

console.log(`Puzzle #${puzzle.id}: ${puzzle.display}`);
console.log(`  photo   public/photos/${file} (${width}×${height})`);
console.log(`  accepts ${accept.join(', ')}`);
console.log(`  zooms   ${zooms.join(' → ')}× about (${fx}, ${fy})`);
console.log('Check the first frame with `npm run dev`, then commit and `npm run deploy`.');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith('--')) fail(`Expected a --flag, got ${argv[i]}`);
    out[argv[i].slice(2)] = argv[i + 1];
  }
  return out;
}

function dedupe(items) {
  return [...new Set(items)];
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
