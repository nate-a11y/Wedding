import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Use the bundled wedding fonts rather than machine-specific fallback faces.
process.env.FONTCONFIG_FILE ??= join(root, 'scripts/fonts/fonts.conf');
process.env.PANGOCAIRO_BACKEND ??= 'fc';
const { default: sharp } = await import('sharp');
const output = join(root, 'public/social');
await mkdir(output, { recursive: true });

async function text(value, font, size, top, color = '#faf9f6') {
  const image = await sharp({ text: {
    text: `<span foreground="${color}">${value.replaceAll('&', '&amp;')}</span>`,
    font: `${font} ${size}`, fontfile: join(root, `scripts/fonts/${font.replaceAll(' ', '')}-Regular.ttf`), rgba: true,
  } }).png().toBuffer({ resolveWithObject: true });
  assert(image.info.width <= 1040, `Text exceeds preview safe area: ${value}`);
  assert(top + image.info.height < 590, `Text exceeds preview height: ${value}`);
  return { input: image.data, left: Math.round((1200 - image.info.width) / 2), top };
}

const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#1a1a1a"/>
  <rect x="30" y="30" width="1140" height="570" rx="28" fill="#11130f" stroke="#536537" stroke-width="2"/>
  <path d="M78 506 C320 486 392 536 612 514 S947 493 1122 514" fill="none" stroke="#d4af37" stroke-width="3"/>
</svg>`);

for (const variant of ['wedding', 'address']) {
  const logo = await sharp(join(root, 'public/welcome/nate-and-blake-wordmark.png')).resize({ width: 780 }).png().toBuffer();
  const overlays = [{ input: logo, left: 210, top: variant === 'address' ? 50 : 85 }];
  if (variant === 'address') {
    overlays.push(await text('Share your mailing address', 'Cormorant Garamond', 62, 342));
    overlays.push(await text('For wedding updates and invitations', 'Montserrat', 27, 427, '#c5d0bc'));
  } else {
    overlays.push(await text('October 31, 2027', 'Cormorant Garamond', 64, 365));
    overlays.push(await text('The Callaway Jewel · Fulton, Missouri', 'Montserrat', 27, 449, '#c5d0bc'));
  }
  overlays.push(await text(variant === 'address' ? 'October 31, 2027  ·  nateandblake.me' : 'nateandblake.me', 'Montserrat', 24, 546, '#c5d0bc'));
  const path = join(output, `${variant}-v1.png`);
  await sharp(background).composite(overlays).png({ compressionLevel: 9 }).toFile(path);
  const { width, height } = await sharp(path).metadata();
  assert.equal(width, 1200); assert.equal(height, 630);
  console.log(`Generated ${variant}-v1.png (1200×630)`);
}
