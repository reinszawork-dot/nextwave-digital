// Regenerates PNG icons + the social share image from SVG sources.
// Usage: node scripts/make-icons.mjs
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const favicon = await readFile(new URL('../public/favicon.svg', import.meta.url));
await sharp(favicon, { density: 600 }).resize(180, 180).png().toFile('public/apple-touch-icon.png');
await sharp(favicon, { density: 600 }).resize(512, 512).png().toFile('public/icon-512.png');

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="50%" cy="0%" r="70%"><stop offset="0" stop-color="#3b82f6" stop-opacity=".45"/><stop offset="1" stop-color="#070a13" stop-opacity="0"/></radialGradient>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#60a5fa"/><stop offset=".5" stop-color="#3b82f6"/><stop offset="1" stop-color="#22d3ee"/></linearGradient>
  </defs>
  <rect width="1200" height="630" fill="#070a13"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <g transform="translate(100 150)">
    <rect width="88" height="88" rx="22" fill="#0f1527" stroke="#3b82f6" stroke-opacity=".4" stroke-width="2"/>
    <path d="M16 52c7.5 0 10.3-16.5 18.5-16.5S44.8 55 53 55s10.3-19 18-19" fill="none" stroke="url(#g)" stroke-width="8" stroke-linecap="round"/>
    <text x="116" y="62" font-family="Segoe UI, Inter, Arial, sans-serif" font-size="48" font-weight="700" fill="#f4f6fb" letter-spacing="-1.5">Next<tspan fill="#60a5fa">Wave</tspan> <tspan font-weight="400" fill="#a3acc2">Digital</tspan></text>
  </g>
  <text x="100" y="380" font-family="Segoe UI, Inter, Arial, sans-serif" font-size="64" font-weight="700" fill="#f4f6fb" letter-spacing="-2">Technology designed to make</text>
  <text x="100" y="460" font-family="Segoe UI, Inter, Arial, sans-serif" font-size="64" font-weight="700" fill="url(#g)" letter-spacing="-2">everyday life better.</text>
  <text x="100" y="540" font-family="Segoe UI, Inter, Arial, sans-serif" font-size="26" fill="#6b7590">Budgeting · Sleep &amp; Stress · Habits</text>
</svg>`;
await sharp(Buffer.from(og)).png().toFile('public/og-image.png');
console.log('Icons written.');
