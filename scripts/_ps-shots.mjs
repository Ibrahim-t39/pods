// profile_safety capture: Your seat + every sheet, a person + report + block, texts. Usage: node scripts/_ps-shots.mjs [tag]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const tag = process.argv[2] || "r0";
const base = "http://localhost:3000";
const dir = `shots/ps/${tag}`;
mkdirSync(dir, { recursive: true });
const VPS = {
  m: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  d: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const only = process.argv[3];
const browser = await chromium.launch({ executablePath: CHROME });
for (const [vn, vp] of Object.entries(VPS)) {
  if (only && only !== vn) continue;
  const ctx = await browser.newContext({ ...vp, locale: "en-US", timezoneId: "America/Chicago" });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const shot = async (n) => { await page.waitForTimeout(1000); await page.screenshot({ path: `${dir}/${n}.${vn}.png` }); console.log(`${dir}/${n}.${vn}.png`); };
  try {
    await page.goto(base + "/app?director=1&fast=1", { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await page.getByTestId("dir-skip").click();
    await page.waitForTimeout(2500);
    await page.goto(base + "/app/profile", { waitUntil: "networkidle" }); await shot("01-seat");
    for (const s of ["likes", "free", "community", "texts", "claude", "more", "help", "privacy", "blocked", "delete"]) {
      await page.goto(base + "/app/profile?sheet=" + s, { waitUntil: "networkidle" }); await shot("02-sheet-" + s);
    }
    await page.goto(base + "/app/inbox", { waitUntil: "networkidle" }); await shot("03-inbox");
    // a person you share a pod with
    const uid = await page.evaluate(() => {
      for (const k of Object.keys(localStorage)) {
        try {
          const v = JSON.parse(localStorage.getItem(k));
          const s = v?.state ?? v;
          const db = s?.db ?? s;
          if (db?.memberships && db?.me) {
            const mine = new Set(db.memberships.filter((m) => m.user_id === db.me && !m.left_at).map((m) => m.pod_id));
            const o = db.memberships.find((m) => mine.has(m.pod_id) && m.user_id !== db.me && !m.left_at);
            return o?.user_id;
          }
        } catch {}
      }
      return null;
    });
    console.log("person", uid);
    if (uid) {
      await page.goto(base + "/app/people/" + uid, { waitUntil: "networkidle" }); await shot("04-person");
      await page.getByRole("button", { name: "Report" }).dispatchEvent("click"); await shot("05-report");
      await page.getByRole("radio").first().dispatchEvent("click"); await shot("05b-report-picked");
      await page.getByRole("button", { name: "Send" }).dispatchEvent("click"); await shot("05c-report-sent");
      await page.goto(base + "/app/people/" + uid, { waitUntil: "networkidle" }); await page.waitForTimeout(600);
      await page.getByRole("button", { name: "Block" }).dispatchEvent("click"); await shot("06-block");
    }
  } catch (e) { console.log("ERR", e.message.slice(0, 300)); }
  if (errs.length) console.log("pageerrors", errs.slice(0, 3));
  await ctx.close();
}
await browser.close();
