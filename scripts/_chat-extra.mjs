// Chat redesign extra states: other pod, 1024 sheet, dark mode, long-press menu low on screen, rerun.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const tag = process.argv[2] || "x1";
const dir = `shots/chat/${tag}`;
mkdirSync(dir, { recursive: true });
const base = "http://localhost:3000";
const browser = await chromium.launch({ executablePath: CHROME });
const runs = [
  ["m", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
  ["t", { viewport: { width: 1024, height: 800 }, deviceScaleFactor: 1 }],
  ["dark", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: "dark" }],
];
for (const [vn, vp] of runs) {
  const ctx = await browser.newContext({ ...vp, locale: "en-US", timezoneId: "America/Los_Angeles" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const shot = async (n, w = 1200) => { await page.waitForTimeout(w); await page.screenshot({ path: `${dir}/${n}.${vn}.png` }); console.log(`${dir}/${n}.${vn}.png`); };
  await page.goto(base + "/app?director=1&fast=1", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const pill = page.getByRole("button", { name: "Open director panel" });
  if (await pill.count()) await pill.first().click({ force: true });
  await page.getByTestId("dir-skip").click();
  await page.waitForTimeout(2500);
  const ids = await page.evaluate(() => [...new Set([...document.querySelectorAll("a[href*='/app/pods/']")].map((a) => a.getAttribute("href").split("/")[3]))]);
  console.log(vn, "pods", ids.join(","));
  await page.goto(base + "/app/pods/pod_hoopers/chat", { waitUntil: "networkidle" });
  await shot("10-hoopers");
  for (const id of ids.filter((x) => x && x !== "pod_hoopers").slice(0, 2)) {
    await page.goto(base + `/app/pods/${id}/chat`, { waitUntil: "networkidle" });
    await shot(`11-${id}`);
  }
  if (errs.length) console.log(vn, "ERR", errs.slice(0, 3).join(" | "));
  await ctx.close();
}
await browser.close();
