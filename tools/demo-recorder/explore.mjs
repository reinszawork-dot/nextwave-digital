// Dev helper: open an app at phone size, optionally click through steps, dump buttons + screenshot.
import { chromium } from 'playwright-core';
const [url, out, ...clicks] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
for (const c of clicks) {
  if (c.startsWith('wait:')) { await page.waitForTimeout(+c.slice(5)); continue; }
  const loc = c.startsWith('css:') ? page.locator(c.slice(4)).first() : page.getByText(c, { exact: false }).first();
  await loc.click({ timeout: 4000 }).catch((e) => console.log('CLICK FAIL', c, e.message.split('\n')[0]));
  await page.waitForTimeout(900);
}
const items = await page.$$eval('button, a, [role=tab], [data-tab], [data-nav], [data-view]', (els) =>
  els.filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height; })
     .map((e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${e.dataset.tab ? '[data-tab=' + e.dataset.tab + ']' : ''}${e.dataset.nav ? '[data-nav=' + e.dataset.nav + ']' : ''}${e.dataset.view ? '[data-view=' + e.dataset.view + ']' : ''} "${(e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40)}"`));
console.log(items.slice(0, 60).join('\n'));
await page.screenshot({ path: out });
await browser.close();
