// Core QA fix capture: placed demo account, every core route at 390 and 1440.
// Usage: node scripts/_corefix.mjs tag [m|d] [routes,comma]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const tag = process.argv[2] || "a";
const only = process.argv[3];
const routes = (process.argv[4] || "/app/home,/app/pods,/app/pods/pod_hoopers,/app/pods/pod_hoopers/details,/app/plans,/app/inbox,/app/discover,/app/search,/app/invite").split(",");
const base = "http://localhost:3000";
const dir = `shots/corefix/${tag}`;
mkdirSync(dir, { recursive: true });
const VPS = {
  m: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  d: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const browser = await chromium.launch({ executablePath: CHROME });
for (const [vn, vp] of Object.entries(VPS)) {
  if (only && only !== vn && only !== "both") continue;
  const ctx = await browser.newContext({ ...vp, locale: "en-US", timezoneId: "America/Los_Angeles" });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(base + "/app?director=1&fast=1", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  if (!(await page.getByTestId("dir-skip").isVisible().catch(() => false))) {
    const o = page.getByRole("button", { name: "Open director panel" });
    if (await o.isVisible().catch(() => false)) await o.click();
    else { await page.keyboard.press("Control+Period"); await page.waitForTimeout(500); }
  }
  await page.getByTestId("dir-skip").click();
  await page.waitForTimeout(2500);
  await page.keyboard.press("Escape");
  for (const r of routes) {
    await page.goto(base + r, { waitUntil: "networkidle" });
    await page.waitForTimeout(2200);
    const slug = r.replace(/^\/app\/?/, "").replace(/[^a-z0-9]+/gi, "-") || "app";
    await page.screenshot({ path: `${dir}/${slug}.${vn}.png` });
    const t = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").slice(0, 400));
    console.log(`${dir}/${slug}.${vn}.png ::`, t);
  }
  if (errs.length) console.log("pageerrors", errs.slice(0, 3));
  await ctx.close();
}
await browser.close();
