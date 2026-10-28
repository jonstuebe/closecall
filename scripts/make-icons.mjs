// Renders the PWA icons and the link-preview card from the wordmark's magnifier. Usage: npm run icons
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const outDir = new URL('../public/icons/', import.meta.url);
await mkdir(outDir, { recursive: true });

const INK = '#17232e';
const LENS = '#d9950f';

/**
 * @param {number} radius corner rounding; 0 for full-bleed (maskable and iOS add their own mask)
 * @param {number} scale artwork scale; maskable icons keep their art inside the central 80%
 */
const icon = (radius, scale) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${radius}" fill="${INK}"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)"
     fill="none" stroke="${LENS}" stroke-width="40" stroke-linecap="round">
    <circle cx="224" cy="224" r="128"/>
    <path d="M316 316 414 414"/>
  </g>
</svg>`;

const targets = [
  { file: 'icon-192.png', size: 192, svg: icon(96, 1) },
  { file: 'icon-512.png', size: 512, svg: icon(96, 1) },
  { file: 'icon-maskable-512.png', size: 512, svg: icon(0, 0.78) },
  { file: 'apple-touch-icon.png', size: 180, svg: icon(0, 1) },
];

for (const { file, size, svg } of targets) {
  const png = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  await writeFile(new URL(file, outDir), png);
  console.log('wrote', file, `${size}×${size}`);
}

// The og:image. Without one, link previews grab the biggest image on the page: today's photo, unzoomed.
const card = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${INK}"/>
  <g fill="none" stroke="${LENS}" stroke-width="40" stroke-linecap="round" transform="translate(110 115) scale(0.78)">
    <circle cx="224" cy="224" r="128"/>
    <path d="M316 316 414 414"/>
  </g>
  <text x="530" y="330" fill="#f4f1ea" font-family="Helvetica Neue, Arial, sans-serif" font-weight="800" font-size="104" letter-spacing="-3">Close Call</text>
  <text x="534" y="400" fill="#9aa7b4" font-family="Helvetica Neue, Arial, sans-serif" font-weight="500" font-size="36">Name the animal. Way too close.</text>
</svg>`;
await writeFile(new URL('og-card.png', outDir), await sharp(Buffer.from(card)).png().toBuffer());
console.log('wrote og-card.png 1200×630');
