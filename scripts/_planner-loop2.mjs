// planner_loop round 2: lock moment on the own table, the menu, propose sheet, details "more" row. Usage: node scripts/_planner-loop2.mjs <tag> [m|d]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const tag = process.argv[2] || "r2";
const only = process.argv[3];
const base = "http://localhost:3000";
const dir = `shots/planner/${tag}`;
mkdirSync(dir, { recursive: true });
const VPS = {
  m: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  d: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const POD = "/app/pods/pod_hoopers";
const W = { waitUntil: "domcontentloaded" };
const browser = await chromium.launch({ executablePath: CHROME });
for (const [vn, vp] of Object.entries(VPS)) {
  if (only && only !== vn) continue;
  const errs = [];
  const ctx = await browser.newContext({ ...vp, locale: "en-US", timezoneId: "America/Los_Angeles" });
  const page = await ctx.newPage();
  page.setDefaultTimeout(150000);
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/DevTools|HMR|Fast Refresh/.test(m.text()) && errs.push(m.text()));
  const shot = async (n, wait = 900) => { await page.waitForTimeout(wait); const f = `${dir}/${n}.${vn}.png`; await page.screenshot({ path: f }); console.log(f); };
  try {
    await page.goto(`${base}/dev/planner?state=placed&reset=1`, W);
    await page.waitForTimeout(6000);
    await page.goto(base + POD + "/plan/sug_hoopers_1", W);
    await page.waitForSelector(".pd-scroll");
    await page.locator(".pd-scroll").evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
    await shot("01-details-more", 1200);
    await page.getByRole("button", { name: "Propose a hangout" }).click();
    await shot("02-propose-empty", 1000);
    await page.getByLabel("What").fill("Pickup run");
    await page.locator(".pp-chips").nth(0).getByRole("radio").nth(2).click();
    await page.locator(".pp-chips").nth(1).getByRole("radio").nth(0).click();
    await page.locator(".pp-chips").nth(2).getByRole("radio").nth(0).click();
    await shot("03-propose-filled", 600);
    await page.getByRole("button", { name: "Propose", exact: true }).click();
    await shot("04-proposed-toast", 900);
    // the own table + lock moment
    await page.goto(`${base}/dev/planner?state=placed&reset=1`, W);
    await page.waitForTimeout(6000);
    await page.goto(base + POD + "/plan/sug_hoopers_1?table=1", W);
    await page.waitForSelector(".pc");
    await shot("05-card", 4500);
    await page.getByRole("button", { name: "Hoopers #1 menu" }).click();
    await shot("06-menu", 1000);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await page.locator(".pc").getByRole("button", { name: /I'm in/ }).click();
    await shot("07-lock-0.6s", 600);
    await shot("08-lock-2s", 1400);
    await shot("09-lock-settled", 1500);
    const done = page.getByRole("button", { name: "See you there" });
    if (await done.isVisible().catch(() => false)) { await done.click(); await shot("10-after-lock", 1200); }
  } catch (e) { console.log("ERR", e.message.slice(0, 300)); }
  if (errs.length) console.log("ERRORS", [...new Set(errs)].slice(0, 6));
  await ctx.close();
}
await browser.close();
