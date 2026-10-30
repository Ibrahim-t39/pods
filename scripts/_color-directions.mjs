// Renders each palette direction (PODS/v3/color/directions/<X>.css injected over the live app) on the same real screens.
// Usage: node scripts/_color-directions.mjs [A,B,C,D|NONE] [m|d]   → shots/color/dir/<X>/<n>.<m|d>.png
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const D = "/Users/ibrahimtraore/Documents/PROPEL/PODS/v3/color/directions";
const dirs = (process.argv[2] || "A,B,C,D").split(",");
const onlyV = process.argv[3];
const base = "http://localhost:3000";
const VPS = {
  m: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  d: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const browser = await chromium.launch({ executablePath: CHROME });
for (const X of dirs) {
  const css = X === "NONE" ? "" : readFileSync(`${D}/_common.css`, "utf8") + readFileSync(`${D}/${X}.css`, "utf8");
  let landing = ""; try { landing = readFileSync(`${D}/${X}-landing.css`, "utf8"); } catch {}
  const out = `shots/color/dir/${X}`; mkdirSync(out, { recursive: true });
  for (const [vn, vp] of Object.entries(VPS)) {
    if (onlyV && onlyV !== vn) continue;
    const ctx = await browser.newContext({ ...vp, locale: "en-US", timezoneId: "America/Los_Angeles" });
    await ctx.addInitScript(([c, l]) => {
      const add = () => { const s = document.createElement("style"); s.id = "dir"; s.textContent = c + (location.pathname === "/" ? l : ""); document.head.appendChild(s); };
      if (document.head) add(); else document.addEventListener("DOMContentLoaded", add);
    }, [css, landing]);
    const page = await ctx.newPage(); page.setDefaultTimeout(30000);
    const shot = async (n) => { await page.waitForTimeout(1000); await page.screenshot({ path: `${out}/${n}.${vn}.png` }); };
    try {
      await page.goto(base + "/", { waitUntil: "networkidle" }); await shot("1-landing");
      await page.goto(base + "/app?director=1&fast=1", { waitUntil: "networkidle" }); await page.waitForTimeout(800);
      await page.getByTestId("dir-skip").click(); await page.waitForTimeout(2500);
      await page.goto(base + "/app/pods", { waitUntil: "networkidle" }); await page.waitForTimeout(1200); await shot("2-room");
      const hrefs = await page.evaluate(() => [...document.querySelectorAll("a[href*='/app/pods/']")].map((a) => a.getAttribute("href")));
      await page.goto(base + "/app/settings/safety", { waitUntil: "networkidle" }); await shot("5-safety");
      const pod = hrefs.find((h) => /hoop|bask/i.test(h)) || hrefs[0];
      await page.goto(base + pod, { waitUntil: "networkidle" }); await page.waitForTimeout(3500); await shot("3-plan");
      const imIn = page.getByRole("button", { name: /I'm in/i }).first();
      if (await imIn.isVisible().catch(() => false)) { await imIn.click(); await page.waitForTimeout(4200); await shot("4-lock"); }
      else console.log(X, vn, "no I'm in");
    } catch (e) { console.log("ERR", X, vn, e.message.slice(0, 200)); }
    await ctx.close();
  }
  console.log("done", X);
}
await browser.close();
