// Motion R4 captures → PODS/v3/motion/frames/r4/. Halo lap timeline, tick 3→4 + Locked, reduced motion, landing story.
import { chromium } from "playwright";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const OUT = "/Users/ibrahimtraore/Documents/PROPEL/PODS/v3/motion/frames/r4";
const VPS = { m: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, d: { viewport: { width: 1440, height: 900 } } };
const b = await chromium.launch({ executablePath: CHROME });
for (const rm of [false, true]) for (const [n, vp] of Object.entries(VPS)) {
  const tag = `${n}${rm ? "-rm" : ""}`;
  const ctx = await b.newContext({ ...vp, reducedMotion: rm ? "reduce" : "no-preference" });
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await p.goto("http://localhost:3000/dev/motion", { waitUntil: "domcontentloaded" });
  await p.waitForSelector("[data-lab=halo]");
  const hl = p.locator("[data-lab=halo]"); const bb = await hl.boundingBox(); const clip = { x: bb.x - 16, y: bb.y - 16, width: bb.width + 32, height: bb.height + 32 }; const halo = { screenshot: (o) => p.screenshot({ ...o, clip }) };
  const t0 = Date.now();
  for (const t of [100, 500, 900, 1400, 3000]) {
    await p.waitForTimeout(Math.max(0, t - (Date.now() - t0)));
    await halo.screenshot({ path: `${OUT}/halo-${tag}-${t}ms.png` });
  }
  await p.getByRole("button", { name: "I'm in" }).click();
  await p.waitForTimeout(120); await halo.screenshot({ path: `${OUT}/tick-${tag}-120ms.png` });
  await p.waitForTimeout(600); await halo.screenshot({ path: `${OUT}/tick-${tag}-locked.png` });
  // a long task must not stall the slow drift (compositor check is visual only)
  const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  console.log(tag, "hscroll", sw, "errors", errs.slice(0, 3).join(" | ").slice(0, 300));
  if (!rm) {
    await p.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(1500);
    for (const f of [0, 0.3, 0.55, 0.85, 1]) {
      await p.evaluate((f) => { const h = document.documentElement.scrollHeight - innerHeight; window.scrollTo(0, h * f); }, f);
      await p.waitForTimeout(800);
      await p.screenshot({ path: `${OUT}/story-${tag}-${f}.png` });
    }
  }
  await ctx.close();
}
await b.close();
