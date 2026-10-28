// Marketing area screenshots: every beat of / plus legal, waitlist, OG at 390 and 1440.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const tag = process.argv[2] || 'r0';
const out = `shots/marketing/${tag}`;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });
const VP = { m: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, d: { width: 1440, height: 900, deviceScaleFactor: 1 } };
for (const [k, vp] of Object.entries(VP)) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, ...vp });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${out}/home-a01.${k}.png` });
  for (const b of [1, 2]) {
    await page.evaluate(b => window.scrollTo(0, innerHeight * b), b);
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `${out}/home-a0${b + 1}.${k}.png` });
  }
  for (const r of ['/privacy', '/safety', '/terms', '/waitlist']) {
    await page.goto('http://localhost:3000' + r, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}/${r.slice(1)}.${k}.png` });
  }
  await page.goto('http://localhost:3000/safety', { waitUntil: 'networkidle' });
  await page.click('button.legal-row');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/safety-open.${k}.png` });
  await page.goto('http://localhost:3000/waitlist', { waitUntil: 'networkidle' });
  await page.fill('.wl-field input', '2565550100');
  await page.click('.wl-pill');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/waitlist-done.${k}.png` });
  if (k === 'd') { await page.goto('http://localhost:3000/opengraph-image'); await page.waitForTimeout(800); await page.screenshot({ path: `${out}/og.png` }); }
  console.log(k, errs.length ? 'ERR ' + errs.join(' | ').slice(0, 500) : 'ok');
  await ctx.close();
}
await browser.close();
