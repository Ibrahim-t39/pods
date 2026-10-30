import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const tag = process.argv[2] || "lock"; const dir = `shots/core1/${tag}`; mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });
const B = "http://localhost:3000";
for (const [vn, vp] of Object.entries({ m: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, d: { viewport: { width: 1440, height: 900 } } })) {
  const ctx = await browser.newContext({ ...vp, locale: "en-US", timezoneId: "America/Los_Angeles" });
  const page = await ctx.newPage();
  await page.goto(`${B}/app?director=1&fast=1`, { waitUntil: "networkidle" }); await page.waitForTimeout(800);
  const o = page.getByRole("button", { name: "Open director panel" });
  if (!(await page.getByTestId("dir-skip").isVisible().catch(() => false))) { if (await o.isVisible().catch(() => false)) await o.click(); else await page.keyboard.press("Control+Period"); }
  await page.getByTestId("dir-skip").click(); await page.waitForTimeout(2500); await page.keyboard.press("Escape");
  await page.goto(`${B}/app/pods/pod_hoopers`, { waitUntil: "networkidle" }); await page.waitForTimeout(2500);
  await page.getByRole("button", { name: /I'm in/i }).first().click();
  await page.waitForTimeout(1000); console.log(vn, "counter:", await page.evaluate(() => document.body.innerText.match(/\d of 8 in[^\n]*/)?.[0]));
  await page.waitForTimeout(3000); await page.screenshot({ path: `${dir}/lock.${vn}.png` });
  const sw = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); console.log(vn, "scrollW", sw);
  await page.getByRole("button", { name: "See you there" }).click(); await page.waitForTimeout(1200);
  await page.screenshot({ path: `${dir}/locked.${vn}.png` });
  await ctx.close();
}
await browser.close();
