// Generate PWA icons for GloryBank
// Run: node public/icons/generate-icons.js

const fs = require('fs');
const path = require('path');

function createSVG(size, maskable = false) {
  const padding = maskable ? size * 0.1 : 0;
  const iconSize = size - padding * 2;
  const cx = size / 2;
  const cy = size / 2;
  const r = maskable ? size * 0.42 : size * 0.38;
  
  // Scale factors for the bank icon
  const s = iconSize / 32;
  const ox = padding;
  const oy = padding;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#cc0511"/>
      <stop offset="100%" stop-color="#e30613"/>
    </linearGradient>
  </defs>
  ${maskable
    ? `<rect width="${size}" height="${size}" fill="url(#bg)" rx="${size * 0.2}"/>`
    : `<rect width="${size}" height="${size}" fill="url(#bg)" rx="${size * 0.22}"/>`
  }
  <g transform="translate(${cx - 12 * s}, ${cy - 12 * s}) scale(${s})" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="3" y1="22" x2="21" y2="22"/>
    <line x1="6" y1="18" x2="6" y2="11"/>
    <line x1="10" y1="18" x2="10" y2="11"/>
    <line x1="14" y1="18" x2="14" y2="11"/>
    <line x1="18" y1="18" x2="18" y2="11"/>
    <polygon points="12,2 20,7 4,7"/>
  </g>
</svg>`;
}

const sizes = [192, 512];
const variants = [false, true]; // normal, maskable

for (const size of sizes) {
  for (const maskable of variants) {
    const filename = maskable ? `icon-maskable-${size}.svg` : `icon-${size}.svg`;
    const svg = createSVG(size, maskable);
    fs.writeFileSync(path.join(__dirname, filename), svg);
    console.log(`Created ${filename}`);
  }
}

console.log('\nNote: For production, convert SVGs to PNG using a tool like Sharp or Inkscape.');
console.log('For now, update manifest.json to reference .svg files or convert manually.');
