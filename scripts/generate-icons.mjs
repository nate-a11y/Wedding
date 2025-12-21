import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '../public/icons');

// Ensure icons directory exists
mkdirSync(iconsDir, { recursive: true });

// Guest icon SVG - Dark background with gold N&B monogram
const guestIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a1a"/>
      <stop offset="100%" style="stop-color:#2d2d2d"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="64" fill="url(#bg)"/>
  <text x="256" y="200" font-family="Georgia, serif" font-size="120" font-weight="bold" fill="#d4af37" text-anchor="middle">N</text>
  <text x="256" y="280" font-family="Georgia, serif" font-size="48" fill="#d4af37" text-anchor="middle">&amp;</text>
  <text x="256" y="400" font-family="Georgia, serif" font-size="120" font-weight="bold" fill="#d4af37" text-anchor="middle">B</text>
</svg>`;

// Admin icon SVG - Olive green with clipboard and N&B
const adminIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="adminBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#536537"/>
      <stop offset="100%" style="stop-color:#7c9469"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="64" fill="url(#adminBg)"/>
  <!-- Clipboard background -->
  <rect x="116" y="60" width="280" height="360" rx="20" fill="#faf8f5"/>
  <rect x="176" y="40" width="160" height="50" rx="10" fill="#d4af37"/>
  <circle cx="256" cy="65" r="12" fill="#536537"/>
  <!-- N&B Monogram -->
  <text x="256" y="200" font-family="Georgia, serif" font-size="80" font-weight="bold" fill="#536537" text-anchor="middle">N</text>
  <text x="256" y="260" font-family="Georgia, serif" font-size="32" fill="#d4af37" text-anchor="middle">&amp;</text>
  <text x="256" y="360" font-family="Georgia, serif" font-size="80" font-weight="bold" fill="#536537" text-anchor="middle">B</text>
  <!-- Planner text -->
  <text x="256" y="470" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#faf8f5" text-anchor="middle">PLANNER</text>
</svg>`;

const sizes = [192, 512];

async function generateIcons() {
  console.log('Generating PWA icons...');

  for (const size of sizes) {
    // Guest icons
    await sharp(Buffer.from(guestIconSvg))
      .resize(size, size)
      .png()
      .toFile(join(iconsDir, `guest-icon-${size}.png`));
    console.log(`Created guest-icon-${size}.png`);

    // Admin icons
    await sharp(Buffer.from(adminIconSvg))
      .resize(size, size)
      .png()
      .toFile(join(iconsDir, `admin-icon-${size}.png`));
    console.log(`Created admin-icon-${size}.png`);
  }

  console.log('Done! Icons created in public/icons/');
}

generateIcons().catch(console.error);
