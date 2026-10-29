import { chromium } from "/Users/ibrahimtraore/Documents/PROPEL/pods-app/node_modules/playwright/index.mjs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const OUT = "/Users/ibrahimtraore/Documents/PROPEL/PODS/v3/final-pass/onboarding";
const base = "http://localhost:3000";
const VP = { m: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, t: { viewport: { width: 768, height: 1024 } }, d: { viewport: { width: 1440, height: 900 } } };
const only = process.argv[2]; const onlyMode = process.argv[3];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: CHROME });
const issues = [];
async function audit(page, tag, mobile) {
  const r = await page.evaluate((mobile) => {
    const out = [];
    const de = document.documentElement;
    if (de.scrollWidth > de.clientWidth + 1) out.push(`h-overflow ${de.scrollWidth}>${de.clientWidth}`);
    const vis = (e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return s.visibility !== "hidden" && s.display !== "none" && +s.opacity > 0.05 && r.width > 0 && r.height > 0; };
    const desc = (e) => `${e.tagName.toLowerCase()}"${(e.innerText || e.value || e.getAttribute("aria-label") || "").replace(/\s+/g, " ").slice(0, 28)}"`;
    const dlg=[...document.querySelectorAll("[role=dialog]")].find(vis); let ctl = [...document.querySelectorAll("button,a[href],input,[role=button],[role=radio],[role=checkbox]")].filter(vis).filter(e=>!(e.tagName==="A"&&/Skip to/.test(e.innerText))); if(dlg) ctl=ctl.filter(e=>dlg.contains(e));
    const inView = (r) => r.bottom > 0 && r.top < innerHeight;
    if (mobile) for (const e of ctl) { const r = e.getBoundingClientRect(); if (!inView(r)) continue; if ((r.height < 43.5 || r.width < 43.5) && !(e.tagName === "INPUT" && e.type === "hidden")) { if (r.height<43.5 && r.width > 100 && r.height>=40) {} out.push(`small-tap ${desc(e)} ${Math.round(r.width)}x${Math.round(r.height)}`); } }
    for (let i = 0; i < ctl.length; i++) for (let j = i + 1; j < ctl.length; j++) {
      const a = ctl[i], b = ctl[j]; if (a.contains(b) || b.contains(a)) continue;
      const x = a.getBoundingClientRect(), y = b.getBoundingClientRect();
      const w = Math.min(x.right, y.right) - Math.max(x.left, y.left), h = Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top);
      if (w > 2 && h > 2) out.push(`overlap ${desc(a)} / ${desc(b)} ${Math.round(w)}x${Math.round(h)}`);
    }
    // clipped text
    for (const e of document.querySelectorAll("h1,h2,h3,p,span,button,a,label,div")) {
      if (!vis(e) || e.children.length > 3 || e.clientWidth<=1 || e.clientHeight<=1) continue; const t = (e.innerText || "").trim(); if (!t) continue;
      const s = getComputedStyle(e);
      if ((s.overflow !== "visible" || s.textOverflow === "ellipsis") && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1) && !/auto|scroll/.test(s.overflowY + s.overflowX))
        out.push(`clipped ${desc(e)} sw${e.scrollWidth}/${e.clientWidth} sh${e.scrollHeight}/${e.clientHeight}`);
      const r = e.getBoundingClientRect(); if (r.right > innerWidth + 1 || r.left < -1) out.push(`offscreen ${desc(e)} ${Math.round(r.left)}..${Math.round(r.right)}`);
    }
    return [...new Set(out)];
  }, mobile);
  for (const m of r) issues.push(`${tag}: ${m}`);
}
async function run(vp, mode) {
  const mobile = vp === "m"; const tagBase = `${mode}-${vp}`;
  const ctx = await browser.newContext({ ...VP[vp], locale: "en-US", timezoneId: "America/Chicago" });
  const page = await ctx.newPage(); page.setDefaultTimeout(20000);
  page.on("pageerror", (e) => issues.push(`${tagBase}: pageerror ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|DevTools|HMR/.test(m.text())) issues.push(`${tagBase}: console ${m.text().slice(0, 150)}`); });
  let n = 0;
  const snap = async (name) => { await wait(500); n++; const tag = `${tagBase}-${String(n).padStart(2, "0")}-${name}`; await page.screenshot({ path: `${OUT}/${tag}.png` }); await audit(page, tag, mobile);
    if (mobile) { const f = await page.evaluate(() => { const a = document.activeElement; if (!a || !/INPUT|TEXTAREA/.test(a.tagName)) return null; const r = a.getBoundingClientRect(); return r.bottom > innerHeight || r.top < 0; }); if (f) issues.push(`${tag}: focused input out of view`); } };
  const btn = (re) => page.getByRole("button", { name: re }).and(page.locator(":visible")).first();
  const safe = async (name, fn) => { try { await fn(); } catch (e) { issues.push(`${tagBase}: STEP ${name} failed ${String(e.message).split("\n")[0].slice(0,120)}`); await snap(name + "-FAIL").catch(() => {}); } };
  await page.goto(`${base}/app?mode=${mode}`, { waitUntil: "load" });
  await page.waitForURL(/\/app\/(onboarding|welcome)/, { timeout: 60000 });
  await wait(800); await snap("welcome");
  const start = btn(/^Get started$/); if (await start.isVisible().catch(() => false)) await start.click();
  await page.waitForURL(/onboarding\/about/); await wait(600);
  await snap("you-empty");
  await safe("you-error", async () => { await page.getByLabel("Age").fill("12"); await page.getByLabel("First name").fill("A"); await btn(/^Next$/).click({ timeout: 3000 }).catch(() => {}); await snap("you-error"); });
  await safe("you-long", async () => { await page.getByLabel("First name").fill("Maximilienne-Bartholomew Oluwaseun"); await page.getByLabel("Age").fill("22"); await page.getByLabel("First name").focus(); await snap("you-long"); });
  await page.getByLabel("First name").fill("Chanda");
  await btn(/^Next$/).click(); await page.waitForURL(/interests/); await wait(700);
  await snap("likes-empty");
  await safe("likes", async () => {
    for (const like of ["basketball", "guitar"]) { for (let i = 0; i < 6 && !(await btn(new RegExp(`^${like}$`, "i")).isVisible().catch(() => false)); i++) { await btn("More likes").click(); await wait(400); } await btn(new RegExp(`^${like}$`, "i")).click(); }
    await snap("likes-two");
    // many
    for (let k = 0; k < 14; k++) { const more = btn(/More likes/); const cands = page.locator("main button:visible, [role=main] button:visible"); const c = await page.locator("button[aria-pressed=false]:visible").count(); if (c) await page.locator("button[aria-pressed=false]:visible").nth(Math.min(k, c - 1)).click().catch(() => {}); }
    await snap("likes-many");
    // deselect extras back to two
    for (let k = 0; k < 30; k++) { const p = page.locator("button[aria-pressed=true]:visible"); if ((await p.count()) <= 2) break; await p.last().click().catch(() => {}); }
  });
  await safe("communities", async () => {
    await btn(/^Community pods$/).click(); const sheet = page.getByRole("dialog").and(page.locator(":visible")).first(); await sheet.waitFor(); await wait(400); await snap("communities-sheet");
    for (const w of ["Southern African", "Zambian"]) await sheet.getByRole("button", { name: new RegExp(`^${w}$`) }).first().click();
    await sheet.getByRole("button", { name: "Seventh-day Adventist" }).first().click(); await wait(300); await snap("communities-chosen");
    await sheet.getByRole("button", { name: /^Done$/ }).click(); await wait(500); await snap("likes-done");
  });
  await btn(/^Next$/).click(); await page.waitForURL(/availability/); await wait(600); await snap("free-empty");
  await safe("free", async () => { for (const d of ["Saturday", "Sunday", "Wednesday"]) await page.getByRole("button", { name: d }).first().click(); await snap("free-filled"); });
  await btn(/^Next$/).click(); await page.waitForURL(/account/); await wait(600); await snap("seat-empty");
  await safe("seat", async () => {
    await page.getByPlaceholder(/555/).fill("2565550142"); await btn(/^Send code$/).click(); await page.locator("input[autocomplete='one-time-code']").waitFor(); await wait(400); await snap("seat-code");
    await page.locator("input[autocomplete='one-time-code']").fill("000000"); await wait(1200); await snap("seat-wrong-code");
    await page.locator("input[autocomplete='one-time-code']").fill("123456");
  });
  await page.waitForURL(/pledge/, { timeout: 30000 }); await wait(600); await snap("promise");
  await btn(/^I promise$/).click(); await page.waitForURL(/verify/); await wait(700); await snap("verify");
  const wo = btn(/^Without the camera$/); if (await wo.isVisible().catch(() => false)) await wo.click(); else await btn(/^Start$/).click();
  await page.waitForURL(/placing/, { timeout: 60000 }); await wait(1500); await snap("finding");
  await safe("reveal", async () => { await page.getByText(/^Your pods\.?$/).and(page.locator(":visible")).first().waitFor({ timeout: 60000 }); await wait(1500); await snap("reveal"); });
  await ctx.close();
}
for (const vp of Object.keys(VP)) { if (only && only !== vp) continue; for (const mode of ["demo", "live"]) { if (onlyMode && onlyMode !== mode) continue; await run(vp, mode).catch((e) => issues.push(`${mode}-${vp}: FATAL ${e.message.split("\n")[0]}`)); } }
await browser.close();
console.log(issues.length ? issues.join("\n") : "CLEAN");
