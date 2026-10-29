// Screenshot every in-app page as the signed-in Demo user (Chanda), at phone and laptop sizes.
// Signs in by skipping onboarding through the Director panel, then visits each route.
// Usage: node scripts/shoot-all.mjs <outDir> [routes...]   (default: every main in-app route)
// Writes <outDir>/<slug>.<m|d>.png (full page) and prints overflow/console problems per page.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const BASE = process.env.BASE ?? "http://localhost:3000";
const [out = "shots/all", ...only] = process.argv.slice(2);
const ROUTES = only.length
  ? only
  : [
      "/app/home", "/app/pods", "/app/pods/pod_hoopers", "/app/pods/pod_hoopers/details", "/app/pods/pod_hoopers/members",
      "/app/pods/pod_southern_african", "/app/plans", "/app/inbox", "/app/discover", "/app/search", "/app/people",
      "/app/profile", "/app/profile/edit", "/app/settings", "/app/settings/mode", "/app/safety", "/app/invite",
    ];
const VIEWPORTS = {
  m: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  d: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });
for (const [vp, opts] of Object.entries(VIEWPORTS)) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.setDefaultTimeout(600_000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));

  // sign in: skip onboarding through the Director panel
  await page.goto(`${BASE}/app/home?mode=demo&director=1&fast=1`, { waitUntil: "load" });
  await page.waitForTimeout(2500);
  await page.getByText("Director", { exact: true }).first().click().catch(() => {});
  await page.waitForTimeout(400);
  await page.getByTestId("dir-skip").click().catch(() => {});
  await page.waitForTimeout(2500);

  for (const route of ROUTES) {
    errors.length = 0;
    await page.goto(`${BASE}${route}${route.includes("?") ? "&" : "?"}mode=demo`, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelectorAll("h1,h2,button,a").length > 4).catch(() => {});
    await page.waitForTimeout(2000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const slug = route.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-");
    await page.screenshot({ path: `${out}/${slug}.${vp}.png`, fullPage: true });
    const landed = new URL(page.url()).pathname;
    const notes = [landed !== route ? `redirected to ${landed}` : "", overflow > 1 ? `overflow ${overflow}px` : "", errors.length ? `errors: ${errors.join(" | ")}` : ""].filter(Boolean);
    console.log(`${vp} ${route} ${notes.length ? notes.join("; ") : "ok"}`);
  }
  await ctx.close();
}
await browser.close();
