// Interests + continuous placement capture: first-run likes (empty, picked, full), community sheet, Your seat likes
// sheet (before / after adding a like), the "New pod for you" moment on Home, the Inbox row, joined pod.
// Usage: node scripts/_interests-shots.mjs [tag] [m|d] [demo|live]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const tag = process.argv[2] || "r0";
const only = process.argv[3];
const mode = process.argv[4] || "demo";
const base = "http://localhost:3000";
const dir = `shots/interests/${tag}`;
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
  page.setDefaultTimeout(30000);
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/DevTools|HMR|favicon/i.test(m.text()) && errs.push(m.text()));
  const shot = async (n, wait = 900) => {
    await page.waitForTimeout(wait);
    await page.screenshot({ path: `${dir}/${n}.${vn}.png` });
    console.log(`${dir}/${n}.${vn}.png`);
  };
  try {
    // first run: likes step
    await page.goto(base + `/app/onboarding/interests?mode=${mode}&fast=1`, { waitUntil: "networkidle" });
    await shot("01-likes-empty", 1500);
    await page.getByRole("button", { name: "basketball", exact: true }).click();
    await page.getByRole("button", { name: "guitar", exact: true }).click();
    await shot("02-likes-picked", 700);
    await page.getByRole("button", { name: "Community pods" }).click();
    await shot("03-community-sheet", 900);
    await page.keyboard.press("Escape");
    // placed (Director skip in demo; same in live via the director panel)
    await page.goto(base + `/app?mode=${mode}&director=1&fast=1`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    if (!(await page.getByTestId("dir-skip").isVisible().catch(() => false))) await page.getByRole("button", { name: "Open director panel" }).first().click();
    await page.waitForTimeout(500);
    await page.getByTestId("dir-skip").click();
    await page.waitForTimeout(3000);
    await page.goto(base + "/app/home?fast=1", { waitUntil: "networkidle" });
    await shot("04-home-before", 2000);
    await page.goto(base + "/app/profile?sheet=likes&fast=1", { waitUntil: "networkidle" });
    await shot("05-seat-likes", 1500);
    await page.getByRole("checkbox", { name: "Running" }).click();
    await shot("06-seat-likes-found", 1800);
    await page.goto(base + "/app/home?fast=1", { waitUntil: "networkidle" });
    await shot("07-home-new-pod", 2500);
    await page.goto(base + "/app/inbox?fast=1", { waitUntil: "networkidle" });
    await shot("08-inbox", 1500);
    await page.goto(base + "/app/home?fast=1", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const join = page.getByRole("button", { name: /^Join/ }).first();
    if (await join.count()) {
      await join.click();
      await shot("09-joined", 1400);
      await shot("10-home-after", 3200);
    }
    // a community added later: Muslim row → the faith pod proposes itself inside the sheet
    await page.goto(base + "/app/profile?sheet=community&fast=1", { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    await page.getByRole("checkbox", { name: "Muslim" }).click();
    await shot("11-community-found", 2200);
    await page.getByRole("button", { name: "Not now" }).first().click();
    await shot("12-community-not-now", 900);
  } catch (e) {
    console.log("FAIL", e.message.split("\n")[0]);
    await page.screenshot({ path: `${dir}/zz-fail.${vn}.png` });
  }
  if (errs.length) console.log("ERRORS", errs.slice(0, 5).join(" | ").slice(0, 600));
  await ctx.close();
}
await browser.close();
