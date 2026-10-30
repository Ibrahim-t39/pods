import { chromium } from "playwright";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const b = await chromium.launch({ executablePath: CHROME });
for (const [n, vp] of [["d", { viewport: { width: 1440, height: 900 } }], ["m", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
  const ctx = await b.newContext({ ...vp, locale: "en-US", timezoneId: "America/Los_Angeles" });
  const p = await ctx.newPage(); const errs = [];
  p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await p.goto("http://localhost:3000/dev/planner?state=reveal&reset=1", { waitUntil: "load", timeout: 120000 });
  await p.waitForTimeout(3500);
  await p.goto("http://localhost:3000/app/pods/pod_hoopers", { waitUntil: "load", timeout: 120000 });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `shots/planner/r2/15-pre.${n}.png` }); await p.getByRole("button", { name: "Pick a time" }).first().click({ timeout: 60000 });
  await p.waitForTimeout(3500);
  await p.getByRole("radiogroup", { name: "Pick a time" }).getByRole("radio").nth(1).click();
  await p.waitForTimeout(1000);
  await p.screenshot({ path: `shots/planner/r2/15-vote-fix.${n}.png` });
  console.log(n, errs.slice(0, 3));
  await ctx.close();
}
await b.close();
