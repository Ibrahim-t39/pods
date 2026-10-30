// Chat redesign capture: Talk at every state, phone and laptop.
// Usage: node scripts/_chat-shots.mjs [tag] [m|d]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const tag = process.argv[2] || "r0";
const only = process.argv[3];
const base = "http://localhost:3000";
const dir = `shots/chat/${tag}`;
mkdirSync(dir, { recursive: true });
const VPS = {
  m: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  d: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const browser = await chromium.launch({ executablePath: CHROME });
for (const [vn, vp] of Object.entries(VPS)) {
  if (only && only !== vn) continue;
  const ctx = await browser.newContext({ ...vp, locale: "en-US", timezoneId: "America/Los_Angeles" });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/DevTools|HMR|favicon/.test(m.text()) && errs.push(m.text()));
  const shot = async (n, wait = 900) => {
    await page.waitForTimeout(wait);
    await page.screenshot({ path: `${dir}/${n}.${vn}.png` });
    console.log(`${dir}/${n}.${vn}.png`);
  };
  const openDir = async () => {
    const pill = page.getByRole("button", { name: "Open director panel" });
    if (await pill.count()) await pill.first().click({ force: true });
    else { await page.keyboard.press("Control+Period"); await page.waitForTimeout(500); if (await pill.count()) await pill.first().click({ force: true }); }
    await page.waitForTimeout(500);
  };
  const dirRun = async (id) => {
    await openDir();
    await page.getByTestId(id).click();
    await page.waitForTimeout(3000);
    await page.keyboard.press("Escape").catch(() => {});
  };
  const chat = `/app/pods/pod_hoopers/chat`;
  try {
    await page.goto(base + "/app?director=1&fast=1", { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await openDir();
    await page.getByTestId("dir-skip").click();
    await page.waitForTimeout(2500);
    await page.goto(base + chat, { waitUntil: "networkidle" });
    await shot("01-open", 1800);
    const field = page.getByRole("textbox", { name: /message/i }).first();
    await field.click();
    await field.fill("Anyone bringing a ball?");
    await shot("02-typing", 300);
    await field.press("Enter");
    await shot("03-sent", 900);
    // react / reply on a line from someone else
    const other = page.locator("[data-line]:not([data-mine])").last();
    if (await other.count()) {
      if (vn === "d") { await other.hover(); await shot("04a-hover", 300); }
      await other.locator("[data-bubble]").first().click({ delay: 600 }).catch((e) => console.log("lp", e.message.slice(0, 80)));
      await shot("04-menu", 700);
      await page.getByRole("menuitem", { name: /^fire$/i }).first().click().catch(() => {});
      await shot("05-reacted", 700);
      // reply via menu
      await other.locator("[data-bubble]").first().click({ delay: 600 }).catch(() => {});
      await page.waitForTimeout(500);
      await page.getByRole("menuitem", { name: /^reply/i }).first().click().catch(() => {});
      await field.fill("Count me in for tacos");
      await shot("05b-replying", 400);
      await field.press("Enter");
      await shot("05c-replied", 900);
    }
    await page.getByRole("button", { name: /add photo, poll or plan/i }).first().click().catch(() => {});
    await shot("06-plus", 600);
    await page.getByRole("menuitem", { name: /^poll/i }).first().click().catch(() => {});
    await page.getByLabel("Question").fill("Tacos after?").catch(() => {});
    await page.getByLabel("Option 1").fill("Yes").catch(() => {});
    await page.getByLabel("Option 2").fill("Next time").catch(() => {});
    await shot("06b-poll-compose", 300);
    await page.getByRole("button", { name: /^post$/i }).click().catch(() => {});
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: /^yes/i }).last().click().catch(() => {});
    await shot("06c-poll", 900);
    await page.getByRole("button", { name: /^I'm in$/ }).first().click().catch((e) => console.log("in", e.message.slice(0, 80)));
    await shot("06e-in", 1600);
    for (const id of ["dir-jump", "dir-checkin", "dir-reveal"]) {
      await page.goto(base + "/app/pods/pod_hoopers?director=1&fast=1", { waitUntil: "networkidle" });
      await page.waitForTimeout(1200);
      await dirRun(id);
      if (id === "dir-jump") {
        await page.goto(base + chat, { waitUntil: "networkidle" });
        await shot("06d-checkin", 1800);
      }
    }
    await page.goto(base + chat, { waitUntil: "networkidle" });
    await shot("07-after", 2000);
    await shot("07b-vote", 9000);
    await page.getByRole("button", { name: /day|sat|sun|mon|tue|wed|thu|fri|nov/i }).filter({ has: page.locator("span.tabular") }).first().click().catch(() => {});
    await shot("07c-voted", 1200);
    // scroll up to show history
    await page.evaluate(() => { const b = document.querySelector("[data-talk-scroll]") || document.querySelector("[role=log]")?.closest(".overflow-y-auto"); if (b) b.scrollTop = 0; });
    await shot("08-top", 600);
  } catch (e) {
    console.log("ERR", e.message.slice(0, 300));
    await shot("99-error", 100);
  }
  if (errs.length) console.log(vn, "ERRORS:", errs.slice(0, 5).join(" | ").slice(0, 800));
  await ctx.close();
}
await browser.close();
