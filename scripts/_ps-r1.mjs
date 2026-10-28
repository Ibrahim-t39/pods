// profile_safety QA round 1 capture. Usage: node scripts/_ps-r1.mjs <tag> [m|d]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const tag = process.argv[2] || "before";
const only = process.argv[3];
const base = "http://localhost:3000";
const dir = `shots/ps-r1/${tag}`;
mkdirSync(dir, { recursive: true });
const VPS = {
  m: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  d: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const browser = await chromium.launch({ executablePath: CHROME });
for (const [vn, vp] of Object.entries(VPS)) {
  if (only && only !== vn) continue;
  const ctx = await browser.newContext({ ...vp, locale: "en-US", timezoneId: "America/Chicago" });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const shot = async (n, full) => { await page.waitForTimeout(1100); await page.screenshot({ path: `${dir}/${n}.${vn}.png`, fullPage: !!full }); console.log(`${dir}/${n}.${vn}.png`); };
  const go = (p) => page.goto(base + p, { waitUntil: "networkidle" });
  try {
    await go("/app?director=1&fast=1");
    await page.waitForTimeout(800);
    if (!(await page.getByTestId("dir-skip").isVisible().catch(() => false))) await page.getByLabel("Open director panel").click(); await page.waitForTimeout(500); await page.getByTestId("dir-skip").click();
    await page.waitForTimeout(2500);
    await go("/app/profile"); await shot("01-profile");
    await go("/app/profile"); await shot("01b-profile-full", true);
    await go("/app/settings"); await shot("02-settings");
    await go("/app/settings"); await shot("02b-settings-full", true);
    await go("/app/settings/mode"); await shot("03-mode");
    await go("/app/safety"); await shot("04-safety");
    await go("/app/safety"); await shot("04b-safety-full", true);
    await go("/app/pods/pod_hoopers");
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: /menu/i }).first().click();
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: "Report someone" }).click(); await shot("05-report-who");
    const r = page.getByRole("radio").first();
    await r.click(); await shot("05b-report-picked");
    const next = page.getByRole("button", { name: "Next" });
    if (await next.count()) { await next.click(); await shot("05c-report-what"); await page.getByRole("radio").first().click(); }
    await page.getByRole("button", { name: "Send" }).click(); await shot("05d-report-sent");
    await go("/privacy"); await shot("06-privacy");
  } catch (e) { console.log("ERR", e.message.slice(0, 300)); }
  if (errs.length) console.log("pageerrors", errs.slice(0, 3));
  await ctx.close();
}
await browser.close();
