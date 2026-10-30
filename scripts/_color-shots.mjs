// Colour pass capture: /, /app (first run), Your pods, a pod, the plan, the lock. Usage: node scripts/_color-shots.mjs [tag]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const tag = process.argv[2] || "r0";
const base = "http://localhost:3000";
const dir = `shots/color/${tag}`;
mkdirSync(dir, { recursive: true });
const VPS = {
  m: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  d: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const only = process.argv[3];
const browser = await chromium.launch({ executablePath: CHROME });
for (const [vn, vp] of Object.entries(VPS)) {
  if (only && only !== vn) continue;
  const ctx = await browser.newContext({ ...vp, locale: "en-US", timezoneId: "America/Los_Angeles" });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const shot = async (n) => { await page.waitForTimeout(900); await page.screenshot({ path: `${dir}/${n}.${vn}.png` }); console.log(`${dir}/${n}.${vn}.png`); };
  try {
    await page.goto(base + "/", { waitUntil: "networkidle" }); await shot("01-doorway");
    await page.goto(base + "/app", { waitUntil: "networkidle" }); await shot("02-app");
    await page.goto(base + "/app?director=1&fast=1", { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await page.getByTestId("dir-skip").click();
    await page.waitForTimeout(2500);
    await page.goto(base + "/app/pods", { waitUntil: "networkidle" }); await page.waitForTimeout(1500); await shot("03-pods");
    const hrefs = await page.evaluate(() => [...document.querySelectorAll("a[href*='/app/pods/']")].map((a) => a.getAttribute("href")));
    console.log("pod links", [...new Set(hrefs)].slice(0, 6));
    const pod = hrefs.find((h) => /hoop|bask/i.test(h)) || hrefs[0];
    if (pod) {
      await page.goto(base + pod, { waitUntil: "networkidle" }); await page.waitForTimeout(4000); await shot("04-pod");
      const imIn = page.getByRole("button", { name: /I'm in/i }).first();
      if (await imIn.isVisible().catch(() => false)) {
        await imIn.click(); await page.waitForTimeout(2600); await shot("05-lock");
      } else console.log("no I'm in visible");
    }
  } catch (e) { console.log("ERR", e.message.slice(0, 300)); }
  if (errs.length) console.log("pageerrors", errs.slice(0, 3));
  await ctx.close();
}
await browser.close();
