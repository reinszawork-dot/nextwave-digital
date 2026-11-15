// End-to-end smoke test for SOMMR. Run against a running server:
//   BASE_URL=http://localhost:3000 E2E_ADMIN_EMAIL=e2e-admin@sommr.test node tests/e2e/smoke.mjs
// The server must list E2E_ADMIN_EMAIL in ADMIN_EMAILS. Creates throwaway accounts and
// clearly labelled TEST events. Screenshots go to test-results/.
import { mkdirSync } from 'node:fs';
import { chromium, devices } from 'playwright';
import sharp from 'sharp';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const ADMIN = process.env.E2E_ADMIN_EMAIL ?? 'e2e-admin@sommr.test';
const OUT = process.env.SCREENSHOT_DIR ?? 'test-results';
mkdirSync(OUT, { recursive: true });
const photo = `${OUT}/e2e-photo.jpg`;
await sharp({ create: { width: 900, height: 600, channels: 3, background: '#e9a26b' } }).jpeg().toFile(photo);

const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined;
const browser = await chromium.launch({ proxy, args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const results = [];
const problems = [];

async function check(name, fn) {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (err) {
    results.push(['FAIL', name, err.message.split('\n')[0]]);
  }
}
function watch(page, label) {
  page.on('pageerror', (e) => problems.push(`${label} pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource.*(tiles|openfreemap)/.test(m.text()) && problems.push(`${label} console: ${m.text().slice(0, 200)}`));
}
async function newUser(ctx, { name, email, city = 'Cape Town', interests = ['Beaches', 'Food & braais'] }) {
  const page = await ctx.newPage();
  watch(page, name);
  await page.goto(`${BASE}/register`);
  await page.fill('input[name=name]', name);
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', 'e2e-password-123');
  await Promise.all([page.waitForURL('**/onboarding'), page.click('button[type=submit]')]);
  await page.click(`role=radio[name=/${city}/]`);
  await page.click('text=Continue');
  for (const i of interests) await page.click(`button:has-text("${i}")`);
  await Promise.all([page.waitForURL('**/?welcome=1', { timeout: 60_000 }), page.click('text=Start my summer')]);
  return page;
}

const stamp = Date.now();
const ctxOpts = { viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true };
const userCtx = await browser.newContext(ctxOpts);
const adminCtx = await browser.newContext(ctxOpts);
const otherCtx = await browser.newContext(ctxOpts);
let page;
let memoryPhotoUrl;

await check('welcome page renders for visitors', async () => {
  const p = await (await browser.newContext(ctxOpts)).newPage();
  watch(p, 'visitor');
  await p.goto(BASE);
  await p.getByRole('heading', { name: /Make this summer/ }).waitFor();
  await p.screenshot({ path: `${OUT}/01-welcome.png` });
});

await check('protected pages and APIs require sign-in', async () => {
  const p = await (await browser.newContext(ctxOpts)).newPage();
  await p.goto(`${BASE}/challenges`);
  await p.waitForURL('**/login?next=%2Fchallenges', { timeout: 10_000 });
  const r = await p.request.get(`${BASE}/api/places/nearby?lat=-33.9&lng=18.4&categories=coffee`);
  if (r.status() !== 401) throw new Error(`API returned ${r.status()}`);
});

await check('register, onboard and see the dashboard', async () => {
  page = await newUser(userCtx, { name: 'Lerato', email: `e2e+${stamp}@example.com` });
  await page.getByText(/Lerato/).first().waitFor();
  await page.getByText(/days to go|sunny days left/).waitFor();
  await page.getByRole('button', { name: 'Mark as done' }).first().waitFor();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/02-dashboard.png`, fullPage: true });
});

await check('wrong password is rejected politely', async () => {
  const p = await (await browser.newContext(ctxOpts)).newPage();
  await p.goto(`${BASE}/login`);
  await p.fill('input[name=email]', `e2e+${stamp}@example.com`);
  await p.fill('input[name=password]', 'not-the-password');
  await p.click('button[type=submit]');
  await p.getByText('don’t match an account').waitFor();
});

await check('password reset request responds without revealing accounts', async () => {
  const p = await (await browser.newContext(ctxOpts)).newPage();
  await p.goto(`${BASE}/forgot-password`);
  await p.fill('input[name=email]', 'nobody@example.com');
  await p.click('button[type=submit]');
  await p.getByText(/reset link is on its way|not configured/).waitFor();
});

await check('complete and undo a challenge; swap the weekly one', async () => {
  await page.goto(`${BASE}/challenges`);
  const daily = page.locator('article').nth(0);
  const weekly = page.locator('article').nth(1);
  const weeklyTitle = await weekly.locator('h3').innerText();
  await daily.getByRole('button', { name: 'Mark as done' }).click();
  await daily.getByText(/Done · \+\d+/).waitFor();
  await daily.getByRole('button', { name: /Undo/ }).click();
  await daily.getByRole('button', { name: 'Mark as done' }).click();
  await daily.getByText(/Done · \+\d+/).waitFor();
  await weekly.getByRole('button', { name: /^Swap/ }).click();
  await page.getByText('Swapped', { exact: true }).waitFor({ timeout: 15_000 });
  for (let i = 0; i < 30 && (await weekly.locator('h3').innerText()) === weeklyTitle; i++) await page.waitForTimeout(500);
  if ((await weekly.locator('h3').innerText()) === weeklyTitle) throw new Error(`weekly challenge still “${weeklyTitle}” after swapping`);
  await page.screenshot({ path: `${OUT}/03-challenges.png`, fullPage: true });
});

await check('bucket list: add, tick off, delete', async () => {
  await page.goto(`${BASE}/my-summer/bucket-list`);
  await page.fill('#bucket-new', 'E2E: swim at a tidal pool');
  await page.getByRole('button', { name: 'Add to bucket list' }).click();
  await page.getByText('E2E: swim at a tidal pool').waitFor();
  await page.getByRole('checkbox', { name: /E2E: swim/ }).click();
  await page.getByText(/1\s+of\s+1/).waitFor();
  await page.getByRole('button', { name: /Take a surf lesson/ }).click();
  await page.getByRole('checkbox', { name: /Take a surf lesson/ }).waitFor();
  await page.getByRole('button', { name: 'Edit Take a surf lesson' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  const dialog = page.getByRole('alertdialog');
  await dialog.getByRole('button', { name: 'Remove' }).click();
  await dialog.waitFor({ state: 'detached' });
  await page.locator('textarea[aria-label="Notes"]').waitFor({ state: 'detached' });
  // The suggestion is offered again once it's off the list.
  await page.getByRole('button', { name: /Take a surf lesson/ }).waitFor();
  await page.screenshot({ path: `${OUT}/04-bucket.png`, fullPage: true });
});

await check('save a memory with a photo; photos are private', async () => {
  await page.goto(`${BASE}/my-summer/new`);
  await page.setInputFiles('input[type=file][accept]', photo);
  await page.waitForSelector('img[alt="Selected photo 1"]');
  await page.fill('#m-title', 'E2E memory');
  await page.fill('#m-body', 'Written by the automated test.');
  await Promise.all([page.waitForURL('**/my-summer/memories/**'), page.getByRole('button', { name: 'Save memory' }).click()]);
  memoryPhotoUrl = await page.locator('img[alt^="Photo 1"]').getAttribute('src');
  const own = await page.request.get(BASE + memoryPhotoUrl);
  if (own.status() !== 200 || own.headers()['content-type'] !== 'image/jpeg') throw new Error(`owner got ${own.status()}`);
  const other = await newUser(otherCtx, { name: 'Other', email: `e2e-other+${stamp}@example.com`, city: 'Durban' });
  const theirs = await other.request.get(BASE + memoryPhotoUrl);
  if (theirs.status() !== 404) throw new Error(`another user got ${theirs.status()}`);
  await page.goto(`${BASE}/my-summer`);
  await page.getByText('E2E memory').first().waitFor();
});

await check('explore map loads', async () => {
  await page.goto(`${BASE}/explore?category=coffee`);
  await page.locator('canvas.maplibregl-canvas').waitFor({ timeout: 30_000 });
  await page.locator('[role=status]').filter({ hasText: /in view|Zoom in|unavailable|couldn/ }).first().waitFor({ timeout: 90_000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/05-explore.png` });
});

let eventPath;
await check('admin creates an event that appears in What’s On', async () => {
  const admin = await newUser(adminCtx, { name: 'Admin', email: ADMIN, city: 'Johannesburg', interests: ['Music'] }).catch(async () => {
    const p = await adminCtx.newPage();
    await p.goto(`${BASE}/login`);
    await p.fill('input[name=email]', ADMIN);
    await p.fill('input[name=password]', 'e2e-password-123');
    await Promise.all([p.waitForURL((u) => !u.pathname.startsWith('/login')), p.click('button[type=submit]')]);
    return p;
  });
  await admin.goto(`${BASE}/admin/events/new`);
  await admin.fill('input[name=title]', `TEST event ${stamp} (automated test)`);
  await admin.selectOption('select[name=category_slug]', 'music');
  const d = new Date(Date.now() + 3 * 86_400_000);
  await admin.fill('input[name=starts_at]', `${d.toISOString().slice(0, 10)}T19:00`);
  await admin.fill('input[name=venue_name]', 'Test Venue');
  await admin.selectOption('select[name=city_slug]', 'cape-town');
  await admin.fill('input[name=lat]', '-33.92');
  await admin.fill('input[name=lng]', '18.42');
  await admin.check('input[name=is_free]');
  await Promise.all([admin.waitForURL(/\/admin\/events\/[0-9a-f-]{36}/), admin.click('button:has-text("Create event")')]);
  eventPath = new URL(admin.url()).pathname.replace('/admin', '');
  await page.goto(`${BASE}/whats-on?city=cape-town&price=free`);
  await page.getByText(`TEST event ${stamp}`).waitFor();
  await page.screenshot({ path: `${OUT}/06-whats-on.png`, fullPage: true });
});

await check('event page: save, calendar file', async () => {
  await page.goto(BASE + eventPath);
  await page.getByRole('button', { name: /^Save TEST event/ }).click();
  await page.getByText('Saved').first().waitFor();
  const ics = await page.request.get(`${BASE}/api${eventPath}/ics`);
  if (!(await ics.text()).includes('BEGIN:VEVENT')) throw new Error('no calendar data');
  await page.goto(`${BASE}/my-summer/saved`);
  await page.getByText(`TEST event ${stamp}`).waitFor();
});

await check('member suggestion is held for review, then approved', async () => {
  await page.goto(`${BASE}/submit/event`);
  await page.fill('#s-title', `TEST suggestion ${stamp}`);
  const d = new Date(Date.now() + 4 * 86_400_000);
  await page.fill('#s-start', `${d.toISOString().slice(0, 10)}T10:00`);
  await page.selectOption('#s-cat', 'community');
  await page.fill('#s-venue', 'Test Hall');
  await page.selectOption('#s-city', 'cape-town');
  await page.fill('#s-link', 'https://example.com/test');
  await page.click('button:has-text("Send for review")');
  await page.getByText('Thank you!').waitFor();
  await page.goto(`${BASE}/whats-on?city=cape-town&when=all`);
  if (await page.getByText(`TEST suggestion ${stamp}`).count()) throw new Error('pending suggestion is public');
  const admin = adminCtx.pages()[0];
  await admin.goto(`${BASE}/admin/submissions`);
  const card = admin.locator('li', { hasText: `TEST suggestion ${stamp}` });
  await card.getByRole('button', { name: 'Approve' }).click();
  await admin.getByText('Approved and published').waitFor();
  await page.goto(`${BASE}/whats-on?city=cape-town&when=all`);
  await page.getByText(`TEST suggestion ${stamp}`).waitFor();
});

await check('members cannot open admin', async () => {
  await page.goto(`${BASE}/admin`);
  if (page.url().includes('/admin')) throw new Error('member reached admin');
});

await check('profile preferences save', async () => {
  await page.goto(`${BASE}/profile`);
  await page.click('button:has-text("Markets & shopping")');
  await page.click('button:has-text("Save preferences")');
  await page.getByText('Saved. Your recommendations').waitFor();
});

await check('mobile layout with bottom navigation', async () => {
  const m = await browser.newContext({ ...devices['iPhone 14'], storageState: await userCtx.storageState(), ignoreHTTPSErrors: true });
  const mp = await m.newPage();
  watch(mp, 'mobile');
  for (const [path, file] of [['/', '07-mobile-home'], ['/whats-on', '08-mobile-whats-on'], ['/challenges', '09-mobile-challenges'], ['/my-summer', '10-mobile-my-summer']]) {
    await mp.goto(BASE + path);
    await mp.getByRole('navigation', { name: 'Main' }).last().waitFor();
    await mp.waitForTimeout(1200);
    await mp.screenshot({ path: `${OUT}/${file}.png` });
  }
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) throw new Error(`page scrolls sideways by ${overflow}px`);
});

await check('delete account removes access', async () => {
  const p = otherCtx.pages()[0];
  await p.goto(`${BASE}/profile`);
  await p.fill('#del-confirm', 'DELETE');
  await Promise.all([p.waitForURL(BASE + '/'), p.click('button:has-text("Delete my account")')]);
  await p.goto(`${BASE}/login`);
  await p.fill('input[name=email]', `e2e-other+${stamp}@example.com`);
  await p.fill('input[name=password]', 'e2e-password-123');
  await p.click('button[type=submit]');
  await p.getByText('don’t match an account').waitFor();
});

await browser.close();
for (const r of results) console.log(r.join('  '));
if (problems.length) console.log('\nBrowser problems:\n' + [...new Set(problems)].join('\n'));
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
