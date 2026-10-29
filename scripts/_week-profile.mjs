import { chromium } from "playwright";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const browser = await chromium.launch({ executablePath: CHROME });
for (const [vp, opts] of [["m", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }], ["d", { viewport: { width: 1440, height: 900 } }]]) {
  const page = await (await browser.newContext(opts)).newPage();
  await page.goto("http://localhost:3000/app/home?mode=demo&director=1&fast=1", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  await page.getByText("Director", { exact: true }).first().click().catch(() => {});
  await page.waitForTimeout(400);
  await page.getByTestId("dir-skip").click().catch(() => {});
  await page.waitForTimeout(2500);
  await page.goto("http://localhost:3000/app/profile?mode=demo", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `shots/week/${vp}-5-profile.png`, fullPage: true });
  await page.locator("section, div").filter({ hasText: /^Free/ }).getByRole("button", { name: /^Edit$/ }).last().click();
  await page.waitForTimeout(1200);
  if (!(await page.getByRole("button", { name: "Tuesday afternoon" }).first().isVisible().catch(() => false))) {
    const ts = await page.getByRole("button", { name: /Edit/ }).evaluateAll((b) => b.map((x) => x.textContent));
    console.log(vp, "edit buttons", ts);
  }
  await page.getByRole("button", { name: "Tuesday afternoon" }).first().click();
  await page.getByRole("button", { name: "Wednesday morning" }).first().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `shots/week/${vp}-6-sheet.png` });
  console.log(vp, "pressed", await page.evaluate(() => document.querySelectorAll(".pods-ob-cell[aria-pressed=true]").length));
}
await browser.close();
