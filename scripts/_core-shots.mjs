// Core colour pass capture: Room, list, arrival, a pod's table, Talk, menu, lock, locked, after hangout #1.
// Usage: node scripts/_core-shots.mjs [tag] [m|d]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const tag = process.argv[2] || "r0";
const only = process.argv[3];
const base = "http://localhost:3000";
const dir = `shots/core/${tag}`;
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
  const shot = async (n, wait = 900) => {
    await page.waitForTimeout(wait);
    await page.screenshot({ path: `${dir}/${n}.${vn}.png` });
    console.log(`${dir}/${n}.${vn}.png`);
  };
  const dirRun = async (id) => {
    await page.keyboard.press("Control+Period");
    await page.waitForTimeout(500);
    await page.getByTestId(id).click();
    await page.waitForTimeout(2500);
    await page.keyboard.press("Escape");
  };
  try {
    await page.goto(base + "/app?director=1&fast=1", { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await page.getByTestId("dir-skip").click();
    await page.waitForTimeout(2500);
    await page.goto(base + "/app/pods?arrive=1", { waitUntil: "networkidle" });
    await shot("01-room-arrive", 2600);
    await page.goto(base + "/app/pods", { waitUntil: "networkidle" });
    await shot("02-room", 1500);
    await page.goto(base + "/app/pods?view=list", { waitUntil: "networkidle" });
    await shot("03-room-list", 1200);
    await page.goto(base + "/app/pods", { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const hrefs = await page.evaluate(() => [...document.querySelectorAll("a[href*='/app/pods/']")].map((a) => a.getAttribute("href")));
    const pod = hrefs.find((h) => /hoop|bask/i.test(h)) || hrefs[0];
    console.log("pod", pod);
    await page.goto(base + pod, { waitUntil: "networkidle" });
    await shot("04-table", 4000);
    await page.getByRole("button", { name: /^Talk/ }).first().click();
    await shot("05-talk", 900);
    const box = page.getByRole("textbox").first();
    await box.fill("Running 5 late, save me a spot");
    await page.getByRole("button", { name: "Send" }).click();
    await shot("06-talk-sent", 900);
    await page.keyboard.press("Escape");
    await page.goto(base + pod + "/details", { waitUntil: "networkidle" });
    await shot("07-menu", 1500);
    await page.goto(base + pod, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
    const imIn = page.getByRole("button", { name: /I'm in/i }).first();
    if (await imIn.isVisible().catch(() => false)) {
      await imIn.click();
      await shot("08-lock", 2600);
      const done = page.getByRole("button", { name: /See you there/ });
      if (await done.isVisible().catch(() => false)) await done.click();
      await shot("09-locked", 1500);
    } else console.log("no I'm in");
    await dirRun("dir-jump");
    await page.goto(base + "/app/pods", { waitUntil: "networkidle" });
    await shot("10-room-held1", 1500);
    await page.goto(base + "/app/events", { waitUntil: "networkidle" });
    await shot("11-events-to-list", 1500);
  } catch (e) {
    console.log("ERR", e.message.slice(0, 300));
  }
  if (errs.length) console.log("pageerrors", errs.slice(0, 3));
  await ctx.close();
}
await browser.close();
