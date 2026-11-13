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
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#151a3c"/><stop offset=".6" stop-color="#0d1128"/><stop offset="1" stop-color="#120f26"/></linearGradient>
    <radialGradient id="a" cx="12%" cy="0%" r="60%"><stop offset="0" stop-color="#9b8cff" stop-opacity=".45"/><stop offset="1" stop-color="#9b8cff" stop-opacity="0"/></radialGradient>
    <radialGradient id="h" cx="60%" cy="82%" r="45%"><stop offset="0" stop-color="#f4977a" stop-opacity=".38"/><stop offset=".6" stop-color="#e88fb4" stop-opacity=".1"/><stop offset="1" stop-color="#e88fb4" stop-opacity="0"/></radialGradient>
    <linearGradient id="em" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b9abff"/><stop offset=".55" stop-color="#ec92b6"/><stop offset="1" stop-color="#f6ab7d"/></linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#a)"/>
  <rect width="1200" height="630" fill="url(#h)"/>
  <g fill="none" stroke-width="1.6">
    <path d="M0 560 C 200 530, 400 590, 600 560 S 1000 530, 1200 560" stroke="#f4977a" stroke-opacity=".45"/>
    <path d="M0 590 C 220 565, 420 615, 640 590 S 1040 565, 1200 590" stroke="#9b8cff" stroke-opacity=".35"/>
    <path d="M0 615 C 180 595, 380 635, 580 615 S 980 595, 1200 615" stroke="#6ccfd8" stroke-opacity=".3"/>
  </g>
  <g transform="translate(96 96)">
    <image href="data:image/svg+xml;base64,${favicon.toString('base64')}" width="72" height="72"/>
    <text x="96" y="49" font-family="${sans}" font-size="38" font-weight="600" fill="#eceef7" letter-spacing="-1">Next<tspan font-family="${serif}" font-style="italic" font-weight="500" fill="url(#em)">Wave</tspan> <tspan font-weight="400" fill="#8a91b0">Digital</tspan></text>
  </g>
  <text x="96" y="340" font-family="${serif}" font-size="76" fill="#eceef7" letter-spacing="-2">Technology designed to make</text>
  <text x="96" y="430" font-family="${serif}" font-size="76" font-style="italic" fill="#d9d3ff" letter-spacing="-2">everyday life better.</text>
  <text x="96" y="510" font-family="${sans}" font-size="26" fill="#8a91b0">Wisely · Lull · Kindling · StudyHub · Forge · CashBook</text>
</svg>`;
await sharp(Buffer.from(og)).png().toFile('public/og-image.png');
console.log('Icons written.');
