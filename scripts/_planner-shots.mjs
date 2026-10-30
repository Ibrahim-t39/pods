// planner_loop colour pass: every state of the table at 390 and 1440. Usage: node scripts/_planner-shots.mjs <tag> [m|d]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const tag = process.argv[2] || "r0";
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
    const ctx = await browser.newContext({ ...vp, locale: "en-US", timezoneId: "America/Chicago" });
    const page = await ctx.newPage();
    page.setDefaultTimeout(30000);
    page.on("pageerror", (e) => errs.push(e.message));
    return { ctx, page };
  };
  const shot = async (page, n, wait = 900) => {
    await page.waitForTimeout(wait);
    const f = `${dir}/${n}.${vn}.png`;
    await page.screenshot({ path: f });
    console.log(f);
  };
  const lab = async (page, state) => {
    await page.goto(`${base}/dev/planner?state=${state}&reset=1`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3500);
    await page.goto(base + POD, { waitUntil: "networkidle" });
  };
  // planner_loop's own frame (?table=1): plan → I'm in → its LockMoment → locked
  try {
    const { ctx, page } = await fresh();
    await page.goto(`${base}/dev/planner?state=placed&reset=1`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3500);
    await page.goto(base + POD + "/plan/sug_hoopers_1?table=1", { waitUntil: "networkidle" });
    await shot(page, "20-own-laying", 900);
    await shot(page, "21-own-plan", 3600);
    const imIn = page.getByRole("button", { name: /I'm in/ }).last();
    if (await imIn.isVisible().catch(() => false)) {
      await imIn.click({ timeout: 5000 }).catch(() => imIn.dispatchEvent("click"));
      await shot(page, "22-own-lock", 2600);
      const done = page.getByRole("button", { name: "See you there" });
      if (await done.isVisible().catch(() => false)) await done.click();
      await shot(page, "23-own-locked", 1200);
    }
    await page.getByRole("button", { name: /menu/i }).first().click().catch(() => {});
    await shot(page, "24-own-menu", 800);
    await ctx.close();
  } catch (e) {
    console.log("ERR own", e.message.slice(0, 200));
  }
  // plan → planning beats → I'm in → lock moment → locked
  try {
    const { ctx, page } = await fresh();
    await page.goto(`${base}/dev/planner?state=placed&reset=1`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3500);
    await page.goto(base + POD, { waitUntil: "networkidle" });
    await shot(page, "01-laying", 700);
    await shot(page, "02-plan", 3800);
    await page.getByRole("button", { name: "Why this plan" }).first().click().catch(() => {});
    await shot(page, "03-why", 700);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    // fill to 3 in via the lab then come back: simpler, tap I'm in (seed may lock on 4th)
    const imIn = page.getByRole("button", { name: /I'm in/ }).first();
    if (await imIn.isVisible().catch(() => false)) {
      await imIn.click();
      await shot(page, "04-after-in", 1600);
      await shot(page, "05-lock-late", 1400);
      const done = page.getByRole("button", { name: "See you there" });
      if (await done.isVisible().catch(() => false)) {
        await done.click();
      }
      await shot(page, "06-locked", 1200);
    }
    await ctx.close();
  } catch (e) {
    console.log("ERR plan", e.message.slice(0, 200));
  }
  for (const [state, name] of [["checkin", "07-okay"], ["ballot", "08-ballot"], ["reveal", "10-reveal"]]) {
    try {
      const { ctx, page } = await fresh();
      await lab(page, state);
      await shot(page, name, 2500);
      if (state === "ballot") {
        await page.getByRole("radio", { name: "Yes" }).first().click().catch(() => {});
        await shot(page, "09-waiting", 1200);
      }
      if (state === "reveal") {
        const pick = page.getByRole("button", { name: "Pick a time" });
        if (await pick.isVisible().catch(() => false)) {
          await pick.click();
          await shot(page, "11-vote", 3500);
          const opt = page.getByRole("radiogroup", { name: "Pick a time" }).getByRole("radio").first();
          if (await opt.isVisible().catch(() => false)) {
            await opt.click();
            await shot(page, "12-vote-picked", 1000);
          }
        }
      }
      await ctx.close();
    } catch (e) {
      console.log("ERR", state, e.message.slice(0, 200));
    }
  }
  if (errs.length) console.log("pageerrors", [...new Set(errs)].slice(0, 4));
}
await browser.close();
