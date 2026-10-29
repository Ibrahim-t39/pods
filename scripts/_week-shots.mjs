import { chromium } from "playwright";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const base = "http://localhost:3000";
const out = "shots/week";
const browser = await chromium.launch({ executablePath: CHROME });
const pressed = (page) => page.evaluate(() => [...document.querySelectorAll(".pods-ob-cell[aria-pressed=true]")].map((b) => b.getAttribute("aria-label")));
for (const [vp, opts] of [["m", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }], ["d", { viewport: { width: 1440, height: 900 } }]]) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(`${base}/app?mode=live`, { waitUntil: "load" });
  await page.waitForURL(/\/app\/(onboarding|welcome)/, { timeout: 120000 });
  const start = page.getByRole("button", { name: /^Get started$/ });
  if (await start.isVisible().catch(() => false)) await start.click();
  await page.getByLabel("First name").fill("Chanda");
  await page.getByLabel("Age").fill("22");
  await page.getByRole("button", { name: /^Next$/ }).click();
  await page.waitForURL(/interests/);
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /^basketball$/i }).click();
  await page.getByRole("button", { name: /^Next$/ }).click();
  await page.waitForURL(/availability/);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/${vp}-1-default.png` });
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, sh: document.documentElement.scrollHeight, ih: innerHeight, g: document.querySelector(".pods-ob-grid").getBoundingClientRect().toJSON() }));
  console.log(vp, "overflow", JSON.stringify(o));
  console.log(vp, "default", (await pressed(page)).length);
  // tap
  await page.getByRole("button", { name: "Tuesday afternoon" }).click();
  console.log(vp, "tap", (await pressed(page)).includes("Tuesday afternoon"));
  // day toggle: Monday all (has evening on) -> turn all on, then off
  await page.getByRole("button", { name: "Monday, all day" }).click();
  console.log(vp, "monday day on", (await pressed(page)).filter((x) => x.startsWith("Monday")).length);
  await page.getByRole("button", { name: "Monday, all day" }).click();
  console.log(vp, "monday day off", (await pressed(page)).filter((x) => x.startsWith("Monday")).length);
  // column toggle
  await page.getByRole("button", { name: "Morning, every day" }).click();
  console.log(vp, "col morning on", (await pressed(page)).filter((x) => x.endsWith("morning")).length);
  await page.getByRole("button", { name: "Morning, every day" }).click();
  console.log(vp, "col morning off", (await pressed(page)).filter((x) => x.endsWith("morning")).length);
  // chips
  await page.getByRole("button", { name: "Weekends" }).click();
  console.log(vp, "weekends", (await pressed(page)).length);
  await page.screenshot({ path: `${out}/${vp}-2-weekends.png` });
  await page.getByRole("button", { name: "Daytime" }).click();
  console.log(vp, "daytime", (await pressed(page)).length);
  await page.getByRole("button", { name: "Evenings" }).click();
  console.log(vp, "evenings", (await pressed(page)).length);
  // drag paint: from Wed morning to Fri afternoon through Thu (on)
  const box = async (n) => (await page.getByRole("button", { name: n }).boundingBox());
  const a = await box("Wednesday morning"), b = await box("Friday morning"), c = await box("Friday afternoon");
  const pt = (r) => [r.x + r.width / 2, r.y + r.height / 2];
  await page.mouse.move(...pt(a)); await page.mouse.down();
  await page.mouse.move(...pt(b), { steps: 8 }); await page.mouse.move(...pt(c), { steps: 8 }); await page.mouse.up();
  console.log(vp, "drag on", (await pressed(page)).filter((x) => /(Wednesday|Thursday|Friday) (morning|afternoon)/.test(x)).length, "(expect 5 of cells wed-m,thu-m,fri-m,fri-a + wed-a? path-dependent)");
  // drag off starting on an on-cell
  const e = await box("Wednesday evening"), f = await box("Friday evening");
  await page.mouse.move(...pt(e)); await page.mouse.down(); await page.mouse.move(...pt(f), { steps: 10 }); await page.mouse.up();
  console.log(vp, "drag off", (await pressed(page)).filter((x) => /(Wednesday|Thursday|Friday) evening/.test(x)).length, "(expect 0)");
  // keyboard
  await page.getByRole("button", { name: "Sunday evening" }).focus();
  await page.keyboard.press("Space");
  console.log(vp, "kbd", (await pressed(page)).includes("Sunday evening"));
  await page.keyboard.press("Space");
  // rhythm
  await page.getByRole("radio", { name: "Changes week to week" }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${vp}-3-changes.png` });
  // reset to default-ish and continue
  await page.getByRole("button", { name: "Weekends" }).click();
  await page.getByRole("button", { name: /^Next$/ }).click();
  await page.waitForURL(/account/);
  await page.getByPlaceholder(/555/).fill("2565550142");
  await page.getByRole("button", { name: /^Send code$/ }).click();
  await page.locator("input[autocomplete='one-time-code']").waitFor();
  await page.locator("input[autocomplete='one-time-code']").fill("123456");
  await page.waitForURL(/pledge/, { timeout: 60000 });
  await page.getByRole("button", { name: /^I promise$/ }).click();
  await page.waitForURL(/verify|placing|home|done/, { timeout: 60000 });
  await page.waitForTimeout(6000);
  console.log(vp, "after signup", new URL(page.url()).pathname);
  await page.screenshot({ path: `${out}/${vp}-4-after.png` });
  const db = await page.evaluate(() => { const r = JSON.parse(localStorage.getItem("pods:live:v1") || "{}"); const d = r.state?.db ?? r.db; const u = d && d.users[d.me]; return u && { av: u.availability, rhythm: u.rhythm, step: u.onboarding_step }; });
  console.log(vp, "user", JSON.stringify(db));
  console.log(vp, "errors", errs.slice(0, 3));
  await ctx.close();
}
await browser.close();
