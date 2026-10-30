import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const tag = process.argv[2] || "before";
const only = process.argv[3];
const dir = `shots/core1/${tag}`; mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });
const B = "http://localhost:3000";
for (const [vn, vp] of Object.entries({ m: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, d: { viewport: { width: 1440, height: 900 } } })) {
  if (only && only !== vn) continue;
  const ctx = await browser.newContext({ ...vp, locale: "en-US", timezoneId: "America/Chicago" });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  const openDir = async () => {
    if (await page.getByTestId("dir-skip").isVisible().catch(() => false)) return;
    const o = page.getByRole("button", { name: "Open director panel" });
    if (await o.isVisible().catch(() => false)) await o.click(); else { await page.keyboard.press("Control+Period"); await page.waitForTimeout(400); }
  };
  await page.goto(`${B}/app?director=1&fast=1`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800); await openDir();
  await page.getByTestId("dir-skip").click(); await page.waitForTimeout(2500);
  await page.keyboard.press("Escape");
  const shot = async (route, name, wait = 1800) => {
    await page.goto(B + route, { waitUntil: "networkidle" }); await page.waitForTimeout(wait);
    await page.screenshot({ path: `${dir}/${name}.${vn}.png` });
    const t = (await page.evaluate(() => document.querySelector("main")?.innerText ?? document.body.innerText)).replace(/\s+/g, " ");
    console.log(`${vn} ${name}: ${t.slice(0, 260)}`);
  };
  await shot("/app/home", "01-home");
  await page.evaluate(() => window.scrollTo(0, 99999)); await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/01b-home-bottom.${vn}.png` });
  await shot("/app/pods", "02-pods");
  await shot("/app/pods/pod_hoopers", "03-hoopers", 2500);
  await shot("/app/pods/pod_hoopers/plan/sug_hoopers_1", "04-plan", 2500);
  await shot("/app/plans", "05-plans");
  await shot("/app/inbox", "06-inbox");
  await shot("/app/discover", "07-discover");
  await shot("/app/search", "08-search");
  await shot("/app/invite", "09-invite");
  await shot("/app/pods/pod_hoopers", "10-hoopers-again", 2500);
  await page.getByRole("button", { name: /I'm in/i }).first().click();
  for (const ms of [300, 900, 1800, 3500]) { await page.waitForTimeout(ms === 300 ? 300 : ms - 300); await page.screenshot({ path: `${dir}/11-lock-${ms}.${vn}.png` }); }
  console.log(vn, "after I'm in:", (await page.evaluate(() => document.body.innerText.replace(/\s+/g, " "))).slice(0, 300));
  if (errs.length) console.log("errors", errs.slice(0, 3));
  await ctx.close();
}
await browser.close();
