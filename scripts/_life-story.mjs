// Captures the Doorway scroll story at fractions of its scroll, phone and laptop → shots/life/story-<f>.<m|d>.png
import { chromium } from "playwright";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const F = (process.argv[2] || "0,0.15,0.3,0.42,0.55,0.65,0.8,1").split(",").map(Number);
const VPS = { m: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, d: { viewport: { width: 1440, height: 900 } } };
const b = await chromium.launch({ executablePath: CHROME });
for (const [n, vp] of Object.entries(VPS)) {
  const ctx = await b.newContext({ ...vp, reducedMotion: process.env.RM ? "reduce" : "no-preference" });
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
  for (const f of F) {
    await p.evaluate((f) => { const h = document.documentElement.scrollHeight - innerHeight; window.scrollTo(0, h * f); }, f);
    await p.waitForTimeout(900);
    await p.screenshot({ path: `shots/life/story-${f}.${n}${process.env.RM ? ".rm" : ""}.png` });
  }
  const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  console.log(n, "hscroll", sw, errs.slice(0, 2).join(" | ").slice(0, 300));
  await ctx.close();
}
await b.close();
