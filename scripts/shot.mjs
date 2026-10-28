// Screenshot routes at mobile + desktop sizes.
// Usage: node scripts/shot.mjs [baseUrl] route1 route2 ...   (default base http://localhost:3000)
// Output: shots/<route-slug>.<mobile|desktop>.png
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const args = process.argv.slice(2);
const base = args[0]?.startsWith('http') ? args.shift() : 'http://localhost:3000';
const routes = args.length ? args : ['/'];
const VIEWPORTS = {
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
};

mkdirSync('shots', { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });
for (const [name, vp] of Object.entries(VIEWPORTS)) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, ...vp });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  for (const route of routes) {
    const slug = route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-') || 'home';
    await page.goto(base + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const file = `shots/${slug}.${name}.png`;
    await page.screenshot({ path: file, fullPage: process.env.FULL === '1' });
    console.log(file, errors.length ? `ERRORS: ${errors.join(' | ').slice(0, 400)}` : 'ok');
    errors.length = 0;
  }
  await ctx.close();
}
await browser.close();
