// Copies MapLibre's self-contained web worker into public/ so the map can load it
// from our own origin (no CDN). Runs automatically on `npm install`.
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'node_modules/maplibre-gl/package.json'), 'utf8'));
const out = join(root, 'public/vendor');
mkdirSync(out, { recursive: true });
copyFileSync(
  join(root, 'node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs'),
  join(out, `maplibre-gl-worker-${pkg.version}.mjs`),
);
console.log(`maplibre worker ${pkg.version} copied to public/vendor`);
