// Dev-only icon generator (run manually): `node scripts/generate-icons.mjs`.
// Requires `sharp` (transitive via Next image optimization; `npm i -D sharp` if
// missing). Rasterizes the RentRights house mark (same shape as app/icon.svg)
// into every raster icon the site needs, so favicon.ico / apple-icon / PWA icons
// all share one brand. Not part of the build/CI — re-run only when the mark changes.
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BLUE = '#1F6B4A';

// House mark on a solid blue field. `rounded` softens the corners (nice in browser
// tabs); square + full-bleed is required for iOS / PWA maskable icons.
function houseSvg({ rounded }) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="${rounded ? 6 : 0}" fill="${BLUE}"/>
  <path d="M16 6 L26 14 V26 H20 V19 H12 V26 H6 V14 Z" fill="#ffffff"/>
</svg>`,
  );
}

const render = (rounded, size) =>
  sharp(houseSvg({ rounded })).resize(size, size).png().toBuffer();

// Pack PNG buffers into a (PNG-compressed) .ico — supported by all modern browsers.
function pngsToIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);
  const entries = Buffer.alloc(16 * pngs.length);
  let offset = 6 + 16 * pngs.length;
  pngs.forEach((p, i) => {
    const e = entries.subarray(i * 16, i * 16 + 16);
    e.writeUInt8(p.size >= 256 ? 0 : p.size, 0); // width (0 => 256)
    e.writeUInt8(p.size >= 256 ? 0 : p.size, 1); // height
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(p.buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += p.buf.length;
  });
  return Buffer.concat([header, entries, ...pngs.map((p) => p.buf)]);
}

mkdirSync(join(ROOT, 'public'), { recursive: true });

// favicon.ico — rounded, 16/32/48.
const icoSizes = [16, 32, 48];
const icoPngs = await Promise.all(
  icoSizes.map(async (size) => ({ size, buf: await render(true, size) })),
);
writeFileSync(join(ROOT, 'app', 'favicon.ico'), pngsToIco(icoPngs));

// apple-icon — 180, square (iOS applies its own rounding).
writeFileSync(join(ROOT, 'app', 'apple-icon.png'), await render(false, 180));

// PWA install icons.
writeFileSync(join(ROOT, 'public', 'icon-192.png'), await render(true, 192));
writeFileSync(join(ROOT, 'public', 'icon-512.png'), await render(true, 512));
// Maskable must be full-bleed; the house already sits inside the safe zone.
writeFileSync(join(ROOT, 'public', 'icon-512-maskable.png'), await render(false, 512));

console.log('Generated: app/favicon.ico, app/apple-icon.png, public/icon-192.png, public/icon-512.png, public/icon-512-maskable.png');
