// Onboarding walk: every first-run screen at 390x844 and 1440x900.
// Usage: node scripts/_ob-shots.mjs <tag>   → shots/ob/<tag>/<nn-screen>.<w>.png
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const tag = process.argv[2] || "now";
const base = "http://localhost:3000";
const out = `shots/ob/${tag}`;
mkdirSync(out, { recursive: true });
const VPS = [
  { w: 390, opts: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  { w: 1440, opts: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
];
const browser = await chromium.launch({ executablePath: CHROME });
for (const vp of VPS) {
  const ctx = await browser.newContext({ ...vp.opts, permissions: [] });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const shot = async (name, wait = 900) => {
    await page.waitForTimeout(wait);
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
    await page.screenshot({ path: `${out}/${name}.${vp.w}.png` });
    console.log(`${out}/${name}.${vp.w}.png`);
  };
  const btn = (n) => page.getByRole("button", { name: n, exact: true }).and(page.locator(":visible")).first();
  try {
    await page.goto(base + "/app/onboarding/about", { waitUntil: "networkidle" });
    await shot("01-you-empty", 1200);
    await page.getByLabel("First name").fill("Chanda");
    await page.getByLabel("Age").fill("16");
    await shot("02-you-under18", 500);
    await page.getByLabel("Age").fill("22");
    await shot("03-you-filled", 500);
    await btn("Next").click();
    await page.waitForURL(/interests/);
    await shot("04-likes-empty");
    await btn("basketball").click();
    await btn("guitar").click();
    await shot("05-likes-picked", 600);
    await page.getByRole("button", { name: "Community pods" }).click();
    await shot("06-community-sheet", 700);
    await btn("Southern African").click();
    await shot("06b-community-region", 500);
    await btn("Zambian").click();
    await btn("Seventh-day Adventist").click();
    await shot("07-community-picked", 500);
    await btn("Done").click();
    await page.waitForTimeout(400);
    await shot("07b-likes-with-community", 500);
    await btn("Next").click();
    await page.waitForURL(/availability/);
    await shot("08-free-empty");
    await page.getByRole("button", { name: "Saturday" }).click();
    await page.getByRole("button", { name: "Monday" }).click();
    await page.locator(".pods-ob-part").first().click();
    await shot("09-free-picked", 600);
    await btn("Next").click();
    await page.waitForURL(/account/);
    await shot("10-seat-number");
    await page.locator(".pods-ob-phone").fill("2565550142");
    await shot("11-seat-filled", 300);
    await btn("Send code").click();
    await page.waitForTimeout(800);
    await page.locator(".pods-ob-code input").fill("123");
    await shot("12-code-typing", 400);
    await page.locator(".pods-ob-code input").fill("123456");
    await page.waitForURL(/pledge/, { timeout: 8000 });
    await shot("13-promise");
    await btn("I promise").click();
    await page.waitForURL(/verify/, { timeout: 8000 });
    await shot("14-verify-idle");
    await page.getByRole("button", { name: "Without the camera" }).click();
    await shot("15-verify-checking", 600);
    await page.waitForFunction(() => /That.s you/.test(document.body.innerText), null, { polling: 50, timeout: 8000 }).catch(() => console.log("no done text"));
    await shot("16-verify-done", 250);
    await page.waitForURL(/placing/, { timeout: 8000 });
    await shot("17-finding", 900);
    await page.waitForFunction(() => /Your pods\./.test(document.body.innerText), null, { polling: 50, timeout: 8000 });
    await shot("18-placed", 900);
    await page.waitForURL(/\/app\/pods/, { timeout: 8000 });
    await shot("18b-home-handoff", 1200);
    await page.goto(base + "/app/onboarding/city", { waitUntil: "networkidle" });
    await shot("19-city");
  } catch (e) {
    console.log("FAIL", vp.w, e.message.split("\n")[0]);
    await page.screenshot({ path: `${out}/zz-fail.${vp.w}.png` });
  }
  if (errs.length) console.log("pageerrors", vp.w, errs.slice(0, 3).join(" | ").slice(0, 400));
  await ctx.close();
}
await browser.close();
