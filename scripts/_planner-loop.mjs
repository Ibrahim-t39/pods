// planner_loop rerun: the Scene 5 beats this area owns (4 card, 5 details, 6 tick + Locked, 7 check-in, run it back,
// vote) at 390 and 1440. Usage: node scripts/_planner-loop.mjs <tag> [m|d]  → shots/planner/<tag>/
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const tag = process.argv[2] || "r1";
const only = process.argv[3];
const base = "http://localhost:3000";
const dir = `shots/planner/${tag}`;
mkdirSync(dir, { recursive: true });
const VPS = {
  m: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  d: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const POD = "/app/pods/pod_hoopers";
const browser = await chromium.launch({ executablePath: CHROME });
for (const [vn, vp] of Object.entries(VPS)) {
  if (only && only !== vn) continue;
  const errs = [];
  const fresh = async () => {
    const ctx = await browser.newContext({ ...vp, locale: "en-US", timezoneId: "America/Los_Angeles" });
    const page = await ctx.newPage();
    page.setDefaultTimeout(150000);
    page.on("pageerror", (e) => errs.push(e.message));
    page.on("console", (m) => m.type() === "error" && !/DevTools|HMR|Fast Refresh/.test(m.text()) && errs.push(m.text()));
    return { ctx, page };
  };
  const shot = async (page, n, wait = 900) => {
    await page.waitForTimeout(wait);
    const f = `${dir}/${n}.${vn}.png`;
    await page.screenshot({ path: f });
    console.log(f);
  };
  const lab = async (page, state, to = POD) => {
    await page.goto(`${base}/dev/planner?state=${state}&reset=1`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3500);
    await page.goto(base + to, { waitUntil: "domcontentloaded" });
  };
  try {
    const { ctx, page } = await fresh();
    await lab(page, "placed", POD + "/plan/sug_hoopers_1?table=1");
    await shot(page, "01-card-own", 4200);
    await page.goto(base + POD + "/plan/sug_hoopers_1", { waitUntil: "domcontentloaded" });
    await shot(page, "02-details", 1400);
    const sc = page.locator(".pd-scroll");
    for (let i = 1; i <= 3; i++) {
      await sc.evaluate((el, y) => el.scrollTo({ top: y }), i * 260);
      await shot(page, `03-details-scroll${i}`, 700);
    }
    const imIn = page.locator(".pd-foot").getByRole("button", { name: /I'm in/ });
    if (await imIn.isVisible().catch(() => false)) {
      await imIn.click();
      await shot(page, "04-tick", 500);
      await shot(page, "05-locked-pill", 700);
      await shot(page, "06-handback", 1800);
      await shot(page, "07-moment-late", 1500);
    } else console.log("no I'm in on details");
    await ctx.close();
  } catch (e) {
    console.log("ERR details", e.message.slice(0, 300));
  }
  try {
    const { ctx, page } = await fresh();
    await lab(page, "locked", POD + "/plan/sug_hoopers_1?table=1");
    await shot(page, "08-card-locked-own", 2500);
    await ctx.close();
  } catch (e) {
    console.log("ERR locked", e.message.slice(0, 200));
  }
  for (const [state, name] of [["checkin", "09-okay"], ["ballot", "10-ballot"], ["reveal", "12-reveal"]]) {
    try {
      const { ctx, page } = await fresh();
      await lab(page, state);
      await shot(page, name, 2500);
      if (state === "ballot") {
        await page.getByRole("radio", { name: "Yes" }).first().click().catch(() => {});
        await shot(page, "11-waiting", 1200);
      }
      if (state === "reveal") {
        const pick = page.getByRole("button", { name: "Pick a time" });
        if (await pick.isVisible().catch(() => false)) {
          await pick.click();
          await shot(page, "13-vote", 10000);
          const opt = page.getByRole("radiogroup", { name: "Pick a time" }).getByRole("radio").first();
          if (await opt.isVisible().catch(() => false)) {
            await opt.click();
            await shot(page, "14-vote-picked", 1000);
          }
        }
      }
      await ctx.close();
    } catch (e) {
      console.log("ERR", state, e.message.slice(0, 200));
    }
  }
  if (errs.length) console.log("ERRORS", [...new Set(errs)].slice(0, 6));
}
await browser.close();
