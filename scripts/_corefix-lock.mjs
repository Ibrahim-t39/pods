// Core QA: tap I'm in on the demo pod and check the count reads exactly 4 of 8 and Locked, also after 8s.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const dir = "shots/corefix/lock"; mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "en-US", timezoneId: "America/Los_Angeles" });
const page = await ctx.newPage();
await page.goto("http://localhost:3000/app?director=1&fast=1", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
if (!(await page.getByTestId("dir-skip").isVisible().catch(() => false))) {
  const o = page.getByRole("button", { name: "Open director panel" });
  if (await o.isVisible().catch(() => false)) await o.click(); else await page.keyboard.press("Control+Period");
}
await page.getByTestId("dir-skip").click();
await page.waitForTimeout(2500);
await page.goto("http://localhost:3000/app/pods/pod_hoopers", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
await page.getByRole("button", { name: /I'm in/i }).first().click();
await page.waitForTimeout(2500);
await page.screenshot({ path: `${dir}/1-lock.png` });
const t1 = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
console.log("after tap:", (t1.match(/\d of 8[^.]*\.?( Locked)?/g) || []).join(" | "));
const done = page.getByRole("button", { name: /See you there|Done|Close/ }).first();
if (await done.isVisible().catch(() => false)) await done.click();
await page.waitForTimeout(9000);
await page.screenshot({ path: `${dir}/2-after.png` });
const t2 = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
console.log("after 9s:", (t2.match(/\d of 8[^.]*\.?( Locked)?/g) || []).join(" | "));
await browser.close();
