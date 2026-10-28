// Admin area capture: every admin screen at 390 and 1440, plus the open report, its menu and the switcher.
// Usage: node scripts/_admin-shots.mjs <tag>   -> shots/admin-v4/<tag>/
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const tag = process.argv[2] || 'r0';
const out = `shots/admin-v4/${tag}`;
mkdirSync(out, { recursive: true });
const B = 'http://localhost:3000';
const browser = await chromium.launch({ executablePath: CHROME });
const VPS = { m: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, d: { width: 1440, height: 900, deviceScaleFactor: 1 } };
for (const [vn, vp] of Object.entries(VPS)) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, ...vp });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const shot = async (name) => { await page.waitForTimeout(1800); await page.screenshot({ path: `${out}/${name}.${vn}.png` }); console.log(`${out}/${name}.${vn}.png`, errs.length ? 'ERR ' + errs.join(' | ').slice(0, 300) : 'ok'); errs.length = 0; };
  for (const r of ['/admin/reports', '/admin/pods', '/admin/hangouts', '/admin']) {
    await page.goto(B + r, { waitUntil: 'load', timeout: 180000 });
    await shot(r.replace(/\//g, '-').slice(1));
  }
  // scrolled (condensing head)
  await page.goto(B + '/admin/hangouts', { waitUntil: 'load', timeout: 180000 });
  await page.waitForTimeout(800);
  await page.mouse.wheel(0, 400); await page.evaluate(() => window.scrollTo(0, 300));
  await shot('hangouts-scrolled');
  // switcher open
  await page.goto(B + '/admin/reports', { waitUntil: 'load', timeout: 180000 });
  await page.waitForTimeout(600);
  await page.locator('header button[aria-haspopup=menu]').click();
  await shot('switcher');
  await page.keyboard.press('Escape');
  // open report
  const row = page.locator('[data-report-row] button').first();
  if (await row.count()) {
    await row.click();
    await shot('report');
    const more = page.getByRole('button', { name: 'More actions' });
    if (await more.count()) { await more.click(); await shot('report-menu'); }
  }
  // loading state: snapshot before hydration is hard; skip
  await ctx.close();
}
await browser.close();
