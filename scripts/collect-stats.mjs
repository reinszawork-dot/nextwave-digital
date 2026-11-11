// Measures the real product apps (which sit next to this project on disk) and writes
// src/data/stats.json. Every number on the "By the numbers" section comes from here.
//
// Usage (from the nextwave-digital folder):  node scripts/collect-stats.mjs
import { readdirSync, readFileSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';

const root = resolve(import.meta.dirname, '..', '..');
const apps = { wisely: 'wisely', lull: 'lull', kindling: 'habit-tracker', studyhub: 'studyhub' };
const skip = new Set(['.git', 'node_modules', 'README.md']);

const out = { measuredOn: new Date().toISOString().slice(0, 10), apps: {} };

for (const [id, folder] of Object.entries(apps)) {
  const dir = join(root, folder);
  let raw = 0, gzip = 0, lines = 0, files = 0;
  // Measure only files committed to git — i.e. what is actually deployed — so local
  // work in progress never skews the numbers. Falls back to walking the folder.
  let list;
  try {
    list = execFileSync('git', ['-C', dir, 'ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
  } catch {
    list = [];
    const walk = (d, rel = '') => {
      for (const name of readdirSync(d)) {
        if (skip.has(name) || name.startsWith('.')) continue;
        const p = join(d, name);
        if (statSync(p).isDirectory()) walk(p, rel + name + '/');
        else list.push(rel + name);
      }
    };
    walk(dir);
  }
  for (const rel of list) {
    const name = rel.split('/').pop();
    if (skip.has(name) || name.startsWith('.')) continue;
    const buf = readFileSync(join(dir, rel));
    files++;
    raw += buf.length;
    gzip += gzipSync(buf, { level: 9 }).length;
    if (/\.(js|css|html)$/.test(name)) lines += buf.toString('utf8').split('\n').length;
  }
  out.apps[id] = {
    files,
    sizeKB: +(raw / 1024).toFixed(1),
    gzipKB: +(gzip / 1024).toFixed(1),
    linesOfCode: lines,
    offline: existsSync(join(dir, 'sw.js')),
    installable: existsSync(join(dir, 'manifest.webmanifest')),
  };
}

writeFileSync(new URL('../src/data/stats.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log(out);
