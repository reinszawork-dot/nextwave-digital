// Regenerates PNG icons + the social share image from SVG sources.
// Usage: node scripts/make-icons.mjs
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const favicon = await readFile(new URL('../public/favicon.svg', import.meta.url));
await sharp(favicon, { density: 600 }).resize(180, 180).png().toFile('public/apple-touch-icon.png');
await sharp(favicon, { density: 600 }).resize(512, 512).png().toFile('public/icon-512.png');

const serif = "Newsreader, 'Iowan Old Style', Georgia, 'Times New Roman', serif";
const sans = "Geist, 'Segoe UI', Arial, sans-serif";
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="a" cx="78%" cy="8%" r="60%"><stop offset="0" stop-color="#e4a07c" stop-opacity=".45"/><stop offset="1" stop-color="#f6f3ec" stop-opacity="0"/></radialGradient>
    <radialGradient id="b" cx="100%" cy="100%" r="50%"><stop offset="0" stop-color="#96accc" stop-opacity=".35"/><stop offset="1" stop-color="#f6f3ec" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#f6f3ec"/>
  <rect width="1200" height="630" fill="url(#a)"/>
  <rect width="1200" height="630" fill="url(#b)"/>
  <g transform="translate(96 96)">
    <rect width="72" height="72" rx="20" fill="#1e1d1a"/>
    <path d="M15 42c6 0 8.3-12.5 14.7-12.5S37.9 44.5 44.5 44.5 52.8 30 58 30" fill="none" stroke="#e4a07c" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="96" y="49" font-family="${sans}" font-size="38" font-weight="600" fill="#1e1d1a" letter-spacing="-1">Next<tspan font-family="${serif}" font-style="italic" font-weight="500" fill="#c26a48">Wave</tspan> <tspan font-weight="400" fill="#8c867a">Digital</tspan></text>
  </g>
  <text x="96" y="356" font-family="${serif}" font-size="76" fill="#1e1d1a" letter-spacing="-2">Technology designed to make</text>
  <text x="96" y="446" font-family="${serif}" font-size="76" font-style="italic" fill="#c26a48" letter-spacing="-2">everyday life better.</text>
  <text x="96" y="540" font-family="${sans}" font-size="26" fill="#8c867a">Wisely · Lull · Kindling · StudyHub</text>
</svg>`;
await sharp(Buffer.from(og)).png().toFile('public/og-image.png');
console.log('Icons written.');
