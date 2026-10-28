// [U11] Smoke test for the Director + crowd + SW. Usage: node scripts/director-smoke.mjs [baseUrl]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const base = process.argv[2] || "http://localhost:3000";
mkdirSync("shots", { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem("pods:v1") || "{}").state?.db ?? JSON.parse(localStorage.getItem("pods:v1") || "{}").db);
await page.goto(base + "/app?director=1&fast=1&sw=1", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.screenshot({ path: "shots/director.mobile.png" });
// beat actions fold the panel to its pill: unfold it before the next action
const click = async (id) => {
  const pill = page.getByRole("button", { name: "Open director panel" });
  if (await pill.isVisible().catch(() => false)) await pill.click();
  await page.getByTestId(id).click();
  await page.waitForTimeout(700);
};
await click("dir-skip");
await page.waitForTimeout(1500);
let d = await state();
console.log("me", d?.me, "memberships", d?.memberships?.filter((m) => m.user_id === d.me).map((m) => `${m.pod_id}:${m.activation}`));
console.log("welcome msgs", Object.entries(d.messages).flatMap(([p, l]) => l.filter((m) => m.client_id?.startsWith("crowd:welcome")).map((m) => `${p}:${m.text}`)));
await page.waitForTimeout(8000);
d = await state();
console.log("welcome after 8s", Object.values(d.messages).flat().filter((m) => m.client_id?.startsWith("crowd:welcome")).length);
// RSVP via the app store is a Repo call; do it through the page's module graph is awkward, so mutate like the repo would.
await click("dir-jump");
d = await state();
console.log("clock", d.clock.virtual_at, "hangouts", Object.values(d.hangouts).map((h) => `${h.id}:${h.status}`));
await click("dir-checkin");
await click("dir-reveal");
await page.screenshot({ path: "shots/director-after.mobile.png" });
console.log("errors", errors.slice(0, 5));
// SW
const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker?.getRegistration(); return r ? { active: !!r.active, scope: r.scope } : null; });
console.log("sw", sw, "caches", await page.evaluate(() => caches.keys()));
await browser.close();
