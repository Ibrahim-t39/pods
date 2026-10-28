// Motion R5: capture the landing scroll story (dev/story) at scroll positions, 390 + 1440, normal + reduced motion.
// Usage: node scripts/_motion-r5.mjs [route] [tag]   -> PODS/v3/motion/frames/r5/<tag>-<m|d>[-rm]-<pos>.png
import { chromium } from 'playwright';
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const route = process.argv[2] || '/dev/story';
const tag = process.argv[3] || 'story';
const OUT = '/Users/ibrahimtraore/Documents/PROPEL/PODS/v3/motion/frames/r5';
const N = +(process.env.N || 14);
const browser = await chromium.launch({ executablePath: CHROME });
for (const [k, vp] of [['m', { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }], ['d', { width: 1440, height: 900, deviceScaleFactor: 1 }]]) {
  for (const rm of process.env.RM ? [false, true] : [false]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, ...vp, reducedMotion: rm ? 'reduce' : 'no-preference' });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await page.goto('http://localhost:3000' + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const sx = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    for (let i = 0; i <= N; i++) {
      const y = Math.round((H * i) / N);
      // scroll in small steps like a person, so scroll-linked state updates
      await page.evaluate(async (to) => { const from = scrollY; for (let s = 1; s <= 8; s++) { scrollTo(0, from + ((to - from) * s) / 8); await new Promise(r => requestAnimationFrame(r)); } }, y);
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${OUT}/${tag}-${k}${rm ? '-rm' : ''}-${String(i).padStart(2, '0')}.png` });
    }
    console.log(k, rm ? 'rm' : '', 'H', H, 'hscroll', sx, errs.length ? 'ERR ' + errs.join(' | ').slice(0, 500) : 'ok');
    await ctx.close();
  }
}
await browser.close();
