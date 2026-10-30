// profile_safety r1: privacy sheet, mode screen, Live -> Demo switch. Usage: node scripts/_ps-r1b.mjs <tag> [m|d]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const tag = process.argv[2] || "after"; const only = process.argv[3];
const base = "http://localhost:3000"; const dir = `shots/ps-r1/${tag}`; mkdirSync(dir, { recursive: true });
const VPS = { m: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, d: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } };
const browser = await chromium.launch({ executablePath: CHROME });
for (const [vn, vp] of Object.entries(VPS)) {
  if (only && only !== vn) continue;
  const ctx = await browser.newContext({ ...vp, locale: "en-US", timezoneId: "America/Chicago" });
  const page = await ctx.newPage(); page.setDefaultTimeout(15000);
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  const shot = async (n) => { await page.waitForTimeout(1100); await page.screenshot({ path: `${dir}/${n}.${vn}.png` }); console.log(`${dir}/${n}.${vn}.png`); };
  const go = (p) => page.goto(base + p, { waitUntil: "networkidle" });
  try {
    await go("/app?director=1&fast=1"); await page.waitForTimeout(800);
    if (!(await page.getByTestId("dir-skip").isVisible().catch(() => false))) await page.getByLabel("Open director panel").click(); await page.waitForTimeout(500); await page.getByTestId("dir-skip").click(); await page.waitForTimeout(2500);
    await go("/app/settings?sheet=privacy"); await shot("07-privacy-sheet");
    await go("/app/settings/mode"); await shot("08-mode");
    // a Live seat (seated through the Director), then Demo for the first time in a fresh browser world
    await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (!k.includes("director")) localStorage.removeItem(k); });
    await go("/app?mode=live&director=1&fast=1"); await page.waitForTimeout(1000);
    if (!(await page.getByTestId("dir-skip").isVisible().catch(() => false))) await page.getByLabel("Open director panel").click();
    await page.waitForTimeout(500); await page.getByTestId("dir-skip").click(); await page.waitForTimeout(2500);
    await go("/app/settings/mode"); await page.waitForTimeout(800); await shot("08b-mode-live");
    await page.getByRole("radio", { name: /Demo/ }).click(); await page.waitForTimeout(4000);
    await page.waitForTimeout(4000); console.log("after demo:", page.url()); await shot("09-after-demo");
  } catch (e) { console.log("ERR", e.message.slice(0, 300)); }
  if (errs.length) console.log("pageerrors", errs.slice(0, 3));
  await ctx.close();
}
await browser.close();
