// Records a short, real demo of each live NextWave app and encodes it for the website.
//
//   cd tools/demo-recorder && npm install && node record.mjs [appId ...]
//
// Each demo runs in a fresh phone-sized Chrome window against the LIVE app, so the videos
// always show the real product. Output goes to ../../public/demos/<id>.{mp4,webm,jpg}.
import { chromium } from 'playwright-core';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const OUT = resolve(import.meta.dirname, '../../public/demos');
const FRAMES = resolve(import.meta.dirname, 'frames');
const VIEWPORT = { width: 390, height: 844 };
const WIDTH = 600; // encoded width (≈2× the on-page size of the player)
const MAX_HOLD = 0.9; // seconds: any longer stretch where nothing moves is trimmed to this
const SPEED = 1.25; // play back a little faster than real time so each clip stays short and lively

/* ------------------------------------------------------------------ */
/* Helpers available to every demo script                              */
/* ------------------------------------------------------------------ */
// A soft ripple drawn where each tap lands, so viewers can follow along.
const TAP_SCRIPT = () => {
  window.__tap = (x, y) => {
    const d = document.createElement('div');
    d.style.cssText = `position:fixed;left:${x - 22}px;top:${y - 22}px;width:44px;height:44px;border-radius:50%;
      background:rgba(30,29,26,.18);border:2px solid rgba(255,255,255,.85);box-shadow:0 2px 10px rgba(0,0,0,.2);
      pointer-events:none;z-index:2147483647;transform:scale(.6);opacity:1;transition:transform .45s cubic-bezier(.22,1,.36,1),opacity .5s ease .1s`;
    document.documentElement.appendChild(d);
    requestAnimationFrame(() => { d.style.transform = 'scale(1.25)'; d.style.opacity = '0'; });
    setTimeout(() => d.remove(), 700);
  };
};

function helpers(page) {
  const wait = (ms) => page.waitForTimeout(ms);
  const loc = (target) => (typeof target === 'string' ? page.locator(target) : target).filter({ visible: true }).first();
  async function tap(target, pause = 650) {
    const l = loc(target);
    console.log('    tap', typeof target === 'string' ? target : String(target));
    await l.scrollIntoViewIfNeeded({ timeout: 4000 });
    const box = await l.boundingBox();
    if (box) await page.evaluate(([x, y]) => window.__tap?.(x, y), [box.x + box.width / 2, box.y + box.height / 2]);
    await wait(140);
    await l.click({ timeout: 4000 });
    await wait(pause);
  }
  async function type(target, text) {
    await tap(target, 200);
    await loc(target).pressSequentially(text, { delay: 90 });
    await wait(300);
  }
  // Smooth, human-ish scroll of whatever is under the middle of the screen.
  async function scroll(px, ms = 1200) {
    await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height * 0.55);
    const steps = Math.max(8, Math.round(ms / 40));
    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel(0, px / steps);
      await wait(ms / steps);
    }
    await wait(300);
  }
  return { page, wait, tap, type, scroll };
}

/* ------------------------------------------------------------------ */
/* The demos — each ~12–18 seconds                                     */
/* ------------------------------------------------------------------ */
const demos = {
  wisely: {
    url: 'https://wisely-phi.vercel.app',
    async run({ page, wait, tap, scroll, poster }) {
      await wait(1300);
      await tap(page.getByText('Explore with demo data').first(), 1700);
      await tap(page.getByRole('button', { name: 'Later' }).first(), 700).catch(() => {});
      await scroll(520, 1500);
      await wait(700);
      await tap('[data-nav=budgets]', 1700);
      await scroll(360, 1100);
      await wait(500);
      await tap('[data-nav=reports]', 2600);
      poster();
      await scroll(420, 1300);
      await wait(1200);
    },
  },
  lull: {
    url: 'https://lull-weld.vercel.app',
    async run({ page, wait, tap, type, scroll, poster }) {
      await wait(1600);
      await tap('#ob [data-n]', 700);
      await tap('#ob [data-g="eating"]', 280);
      await tap('#ob [data-g="sleep"]', 500);
      await tap('#ob [data-n]', 600);
      await type('#obN', 'Sam');
      await tap('#ob [data-n]', 1600);
      await scroll(320, 900);
      await tap('[data-tab="breathe"]', 2400);
      poster();
      await tap('[data-tab="sleep"]', 1800);
    },
  },
  kindling: {
    url: 'https://kindling-inky.vercel.app',
    async run({ page, wait, tap, scroll, poster }) {
      await wait(1400);
      await tap(page.getByRole('button', { name: /Drink water/ }).first(), 1300);
      const counter = page.locator('button').filter({ hasText: /^\s*\d\/8\s*$/ }).first();
      for (let i = 0; i < 8; i++) await tap(counter, i === 7 ? 1400 : 120);
      poster();
      await scroll(380, 1200);
      await wait(500);
      await tap(page.getByRole('link', { name: 'Analytics' }).last(), 2400);
      await scroll(420, 1300);
      await wait(1000);
    },
  },
  studyhub: {
    url: 'https://studyhub-tau-eight.vercel.app',
    async run({ page, wait, tap, type, scroll, poster }) {
      await wait(1400);
      await type(page.getByPlaceholder('Your first name'), 'Alex');
      await tap(page.getByRole('button', { name: 'Get started' }), 1700);
      await scroll(520, 1300);
      await tap('#menu-btn', 600);
      await tap(page.getByRole('link', { name: 'Analytics', exact: true }).first(), 2600);
      poster();
      await scroll(420, 1100);
      await tap('#menu-btn', 600);
      await tap(page.getByRole('link', { name: 'Timer', exact: true }).first(), 900);
      await tap('[aria-label="Start timer"]', 2400);
    },
  },
  forge: {
    url: 'https://reinszawork-dot.github.io/forge/',
    async run({ page, wait, tap, scroll, poster }) {
      await wait(1400);
      await tap(page.getByRole('button', { name: 'Build muscle' }), 500);
      await tap('#pGo', 1600);
      await tap(page.getByRole('button', { name: '5 glasses' }), 900).catch(() => {});
      poster();
      await scroll(380, 1100);
      await wait(400);
      await tap('[data-tab="train"]', 1800);
      await tap('[data-tab="eat"]', 1600);
      await tap('[data-tab="today"]', 1600);
    },
  },
  cashbook: {
    url: 'https://nextwave-digital-six.vercel.app/cashbook/',
    async run({ wait, tap, type, scroll, poster }) {
      // The app's background is always moving, so idle time is never trimmed: keep the pauses short.
      await wait(1100);
      poster();
      await scroll(600, 1000);
      await tap('.fab', 450);
      await type('#txForm [name=amount]', '450');
      await tap('#txForm button[type=submit]', 1000);
      await tap('#navOpen', 450);
      await tap('#nav a[href="#/streams"]', 1600);
      await scroll(400, 900);
      await wait(500);
    },
  },
};

/* ------------------------------------------------------------------ */
/* Recording + encoding                                                */
/* ------------------------------------------------------------------ */
async function record(id) {
  const demo = demos[id];
  const dir = join(FRAMES, id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch({ channel: 'chrome' });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'en-ZA',
    timezoneId: 'Africa/Johannesburg',
    colorScheme: 'light',
    reducedMotion: 'no-preference',
  });
  await context.addInitScript(TAP_SCRIPT);
  const page = await context.newPage();
  await page.goto(demo.url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // Capture frames straight from Chrome's compositor (sharper than its built-in recorder).
  const cdp = await context.newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const file = join(dir, `${String(frames.length).padStart(5, '0')}.jpg`);
    writeFileSync(file, Buffer.from(data, 'base64'));
    frames.push({ file, t: metadata.timestamp });
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });

  const h = helpers(page);
  let posterAt = -1;
  h.poster = () => { posterAt = frames.length; }; // mark the current moment as the poster image
  try {
    await demo.run(h);
  } catch (e) {
    console.warn(`  ! ${id}: step failed — ${e.message.split('\n')[0]}`);
  }
  await page.waitForTimeout(300);
  await cdp.send('Page.stopScreencast');
  await browser.close();

  if (frames.length < 5) throw new Error(`${id}: only ${frames.length} frames captured`);

  // Concat list with real frame timings; hold the last frame briefly so the loop breathes.
  const lines = [];
  frames.forEach((f, i) => {
    const next = frames[i + 1];
    const dur = next ? Math.min(MAX_HOLD, Math.max(0.001, next.t - f.t)) : 0.8;
    lines.push(`file '${f.file.replace(/\\/g, '/')}'`, `duration ${dur.toFixed(4)}`);
  });
  lines.push(`file '${frames.at(-1).file.replace(/\\/g, '/')}'`);
  const list = join(dir, 'list.txt');
  writeFileSync(list, lines.join('\n'));

  // Poster: the moment the script marked with poster(), else a frame ~40% of the way in.
  mkdirSync(OUT, { recursive: true });
  const posterFrame = frames[posterAt > 0 ? Math.min(posterAt, frames.length - 1) : Math.floor(frames.length * 0.4)].file;
  execFileSync(ffmpeg.path, ['-y', '-hide_banner', '-loglevel', 'error', '-i', posterFrame, '-vf', `scale=${WIDTH}:-2:flags=lanczos`, '-q:v', '5', join(OUT, `${id}.jpg`)]);
  return encode(id);
}

// Encodes frames/<id>/list.txt into MP4 (H.264) + WebM (VP9). Returns the clip length in seconds.
function encode(id) {
  const list = join(FRAMES, id, 'list.txt');
  if (!existsSync(list)) throw new Error(`${id}: no recorded frames — record it first`);
  mkdirSync(OUT, { recursive: true });
  // Resample to 30×SPEED fps on the recording's clock, then speed up → a constant 30 fps clip.
  const vf = `fps=${30 * SPEED},setpts=PTS/${SPEED},scale=${WIDTH}:-2:flags=lanczos,format=yuv420p`;
  const base = ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-vf', vf, '-r', '30', '-an'];
  execFileSync(ffmpeg.path, [...base, '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-profile:v', 'high', '-movflags', '+faststart', join(OUT, `${id}.mp4`)]);
  execFileSync(ffmpeg.path, [...base, '-c:v', 'libvpx-vp9', '-crf', '38', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', join(OUT, `${id}.webm`)]);

  let info = '';
  try { execFileSync(ffmpeg.path, ['-hide_banner', '-i', join(OUT, `${id}.mp4`)], { encoding: 'utf8', stdio: 'pipe' }); } catch (e) { info = String(e.stderr); }
  const [, h, m, sec] = info.match(/Duration: (\d+):(\d+):([\d.]+)/) || [0, 0, 0, 0];
  const seconds = +h * 3600 + +m * 60 + +sec;
  const kb = (file) => Math.round(statSync(join(OUT, file)).size / 1024);
  console.log(`  ✓ ${id}: ${seconds.toFixed(1)}s → mp4 ${kb(`${id}.mp4`)} KB, webm ${kb(`${id}.webm`)} KB, poster ${kb(`${id}.jpg`)} KB`);
  return seconds;
}

// `node record.mjs --encode-only [ids]` re-encodes existing frames without re-recording.
const encodeOnly = process.argv.includes('--encode-only');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const ids = args.length ? args : Object.keys(demos);
const durations = {};
for (const id of ids) {
  console.log(`${encodeOnly ? 'Encoding' : 'Recording'} ${id}…`);
  durations[id] = +(encodeOnly ? encode(id) : await record(id)).toFixed(1);
}
// Record each clip's length + date for the site (src/data/demos.json).
const manifestPath = resolve(import.meta.dirname, '../../src/data/demos.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const today = new Date().toISOString().slice(0, 10);
for (const [id, seconds] of Object.entries(durations)) manifest[id] = { seconds, recordedOn: today };
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(durations));
