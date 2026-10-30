// Core QA: after the lock, jump past the hangout and look at Home, the Room and the pod (beat 7 surfaces core owns).
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const dir = "shots/corefix/after"; mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });
for (const [vn, vp] of Object.entries({ m: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, d: { viewport: { width: 1440, height: 900 } } })) {
  const ctx = await browser.newContext({ ...vp, locale: "en-US", timezoneId: "America/Los_Angeles" });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  const openDir = async () => {
    if (await page.getByTestId("dir-skip").isVisible().catch(() => false)) return;
    const o = page.getByRole("button", { name: "Open director panel" });
    if (await o.isVisible().catch(() => false)) await o.click(); else { await page.keyboard.press("Control+Period"); await page.waitForTimeout(400); }
    if (!(await page.getByTestId("dir-skip").isVisible().catch(() => false))) { const o2 = page.getByRole("button", { name: "Open director panel" }); if (await o2.isVisible().catch(() => false)) await o2.click(); }
  };
  await page.goto("http://localhost:3000/app?director=1&fast=1", { waitUntil: "networkidle" });
  await page.waitForTimeout(800); await openDir();
  await page.getByTestId("dir-skip").click(); await page.waitForTimeout(2500);
  await page.goto("http://localhost:3000/app/pods/pod_hoopers", { waitUntil: "networkidle" }); await page.waitForTimeout(2500);
  await page.getByRole("button", { name: /I'm in/i }).first().click(); await page.waitForTimeout(2500);
  const done = page.getByRole("button", { name: /See you there|Done/ }).first();
  if (await done.isVisible().catch(() => false)) await done.click();
  await page.goto("http://localhost:3000/app/home", { waitUntil: "networkidle" }); await page.waitForTimeout(1800);
  await page.screenshot({ path: `${dir}/1-home-locked.${vn}.png` });
  await openDir(); await page.getByTestId("dir-jump").click(); await page.waitForTimeout(2500);
  await page.goto("http://localhost:3000/app/home", { waitUntil: "networkidle" }); await page.waitForTimeout(1800);
  await page.screenshot({ path: `${dir}/2-home-after.${vn}.png` });
  console.log(vn, "home after:", (await page.evaluate(() => document.body.innerText.replace(/\s+/g, " "))).slice(0, 300));
  await page.goto("http://localhost:3000/app/pods", { waitUntil: "networkidle" }); await page.waitForTimeout(1800);
  await page.screenshot({ path: `${dir}/3-room-after.${vn}.png` });
  await page.goto("http://localhost:3000/app/plans", { waitUntil: "networkidle" }); await page.waitForTimeout(1800);
  await page.screenshot({ path: `${dir}/4-plans-after.${vn}.png` });
  await page.goto("http://localhost:3000/app/inbox", { waitUntil: "networkidle" }); await page.waitForTimeout(1800);
  await page.screenshot({ path: `${dir}/5-inbox-after.${vn}.png` });
  if (errs.length) console.log("errors", errs.slice(0, 3));
  await ctx.close();
}
await browser.close();
