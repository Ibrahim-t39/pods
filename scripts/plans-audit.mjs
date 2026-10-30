import { chromium } from "/Users/ibrahimtraore/Documents/PROPEL/pods-app/node_modules/playwright/index.mjs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const OUT = "/Users/ibrahimtraore/Documents/PROPEL/PODS/v3/final-pass/plans";
const base = "http://localhost:3000";
const ONLY = process.argv[2];
const VPS0 = { m: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, t: { viewport: { width: 768, height: 1024 } }, d: { viewport: { width: 1440, height: 900 } } };
const VPS = Object.fromEntries(Object.entries(VPS0).filter(([k]) => !ONLY || k === ONLY));
const b = await chromium.launch({ executablePath: CHROME });
const issues = [];
for (const [k, vp] of Object.entries(VPS)) {
  const ctx = await b.newContext({ ...vp, locale: "en-US" });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/favicon|DevTools|HMR/.test(m.text()) && errs.push(m.text()));
  const audit = async (name) => {
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/${k}-${name}.png` });
    const r = await page.evaluate(() => {
      const out = [];
      const W = document.documentElement.clientWidth;
      if (document.documentElement.scrollWidth > W + 1) out.push(`h-overflow ${document.documentElement.scrollWidth}>${W}`);
      const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && +cs.opacity > 0.05 && r.bottom > 0 && r.top < innerHeight; };
      const label = (e) => (e.innerText || e.getAttribute("aria-label") || "").replace(/\s+/g, " ").slice(0, 30);
      for (const e of document.querySelectorAll("button,a,[role=button],[role=radio],[role=checkbox]")) {
        if (!vis(e)) continue;
        const r = e.getBoundingClientRect();
        if (r.height < 43.5 && r.width < 43.5 || r.height < 43.5 && !e.closest("p,li,span")) { if (!e.classList.contains("sr-only")) out.push(`small-tap ${Math.round(r.width)}x${Math.round(r.height)} "${label(e)}"`); }
        if (r.right > W + 1 || r.left < -1) out.push(`offscreen "${label(e)}"`);
      }
      for (const e of document.querySelectorAll("h1,h2,h3,p,span,button,a,div")) {
        if (!vis(e) || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        const cs = getComputedStyle(e);
        if ((cs.overflow !== "visible" || cs.textOverflow === "ellipsis") && (e.scrollWidth > e.clientWidth + 2 || (cs.overflow === "hidden" && e.scrollHeight > e.clientHeight + 2))) out.push(`clipped "${label(e)}" ${e.scrollWidth}/${e.clientWidth} ${e.scrollHeight}/${e.clientHeight}`);
      }
      // overlapping text leaves
      const leaves = [...document.querySelectorAll("h1,h2,h3,p,button,a,label,[role=radio]")].filter((e) => vis(e) && e.innerText?.trim() && !e.classList.contains("sr-only") && !e.querySelector("h1,h2,h3,p,button,a"));
      for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
        const a = leaves[i], c = leaves[j]; if (a.contains(c) || c.contains(a)) continue;
        const x = a.getBoundingClientRect(), y = c.getBoundingClientRect();
        const ox = Math.min(x.right, y.right) - Math.max(x.left, y.left), oy = Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top);
        if (ox > 4 && oy > 4) out.push(`overlap "${label(a)}" x "${label(c)}"`);
      }
      return out;
    });
    const all = [...r, ...errs.splice(0).map((e) => "console " + e.slice(0, 120))];
    if (all.length) issues.push(`[${k} ${name}]\n  ` + [...new Set(all)].join("\n  "));
    console.log(k, name, all.length ? all.length + " issues" : "clean");
  };
  const click = async (re, role = "button") => { const l = page.getByRole(role, { name: re }).filter({ visible: true }).first(); await l.click(); await page.waitForTimeout(700); };
  const has = (re, role = "button") => page.getByRole(role, { name: re }).filter({ visible: true }).first().isVisible().catch(() => false);
  const vis = page.locator(":visible");
  const btn = (n) => page.getByRole("button", { name: n }).and(vis).first();
  try {
    await page.goto(`${base}/app?mode=demo`, { waitUntil: "load" });
    await page.waitForURL(/\/app\/(onboarding|welcome)/, { timeout: 90000 });
    if (/welcome/.test(page.url())) await btn(/^Get started$/).click();
    await page.waitForURL(/about/);
    await page.getByLabel("First name").fill("Chanda"); await page.getByLabel("Age").fill("22");
    await btn(/^Next$/).click(); await page.waitForURL(/interests/); await page.waitForTimeout(600);
    for (const like of ["basketball", "guitar"]) {
      const re = new RegExp(`^${like}$`, "i");
      for (let i = 0; i < 6 && !(await btn(re).isVisible().catch(() => false)); i++) { await btn("More likes").click(); await page.waitForTimeout(400); }
      await btn(re).click(); await page.waitForTimeout(250);
    }
    await btn(/^Next$/).click(); await page.waitForURL(/availability/); await page.waitForTimeout(600);
    for (const d of ["Saturday", "Sunday", "Wednesday"]) await page.getByRole("button", { name: d }).first().click();
    await btn(/^Next$/).click(); await page.waitForURL(/account/);
    await page.getByPlaceholder(/555/).fill("2565550142"); await btn(/^Send code$/).click();
    await page.locator("input[autocomplete='one-time-code']").fill("123456");
    await page.waitForURL(/pledge/); await btn(/^I promise$/).click(); await page.waitForURL(/verify/);
    await page.waitForTimeout(1500); const w = btn(/^Without the camera$/); if (await w.isVisible().catch(() => false)) await w.click(); else await btn(/^Start$/).click();
    await page.waitForURL(/placing/, { timeout: 90000 });
    await page.getByText(/^Your pods\.?$/).waitFor({ timeout: 90000 });
    const c = btn(/^Continue$/); await page.waitForTimeout(1200); if (await c.isVisible().catch(() => false)) await c.click();
    await page.waitForURL(/home/); await page.waitForTimeout(1500);
    // every pod's plan card
    await page.goto(`${base}/app/pods`, { waitUntil: "load" }); await page.waitForTimeout(1500);
    const ids = await page.evaluate(() => [...new Set([...document.querySelectorAll("a[href^='/app/pods/pod_']")].map((a) => a.getAttribute("href")))]);
    if (!ids.length) ids.push("/app/pods/pod_hoopers"); console.log(k, "pods", ids.join(","));
    await audit("01-pods");
    for (const href of ids) {
      const id = href.split("/").pop();
      await page.goto(base + href, { waitUntil: "load" }); await page.waitForTimeout(1500);
      await audit(`pod-${id}`);
      const open = page.getByRole("link", { name: /Open the plan/ }).filter({ visible: true }).first();
      if (await open.count()) {
        await open.click(); await page.waitForTimeout(1500); await audit(`details-${id}`);
        await page.mouse.wheel(0, 700); await page.evaluate(() => (document.querySelector("main,[role=dialog]")||window).scrollBy?.(0, 700)); await audit(`details-scrolled-${id}`);
        await page.goBack(); await page.waitForTimeout(800);
      }
    }
    await page.goto(`${base}/app/pods/pod_hoopers`, { waitUntil: "load" }); await page.waitForTimeout(1500);
    if (await has(/^I'm in$/)) { await click(/^I'm in$/); await audit("im-in-1"); await page.waitForTimeout(3000); await audit("locked"); }
    await page.goto(`${base}/app/plans`, { waitUntil: "load" }); await audit("plans-list");
    await page.goto(`${base}/app/pods/pod_hoopers?director=1&fast=1`, { waitUntil: "load" }); await page.waitForTimeout(1500);
    const cal = page.getByRole("button", { name: /calendar/i }).filter({ visible: true }).first();
    if (await cal.count()) { await cal.click(); await audit("calendar"); await page.keyboard.press("Escape"); }
    await page.keyboard.press("Control+Period"); await page.waitForTimeout(600);
    const jump = page.getByTestId("dir-jump"); if (await jump.count()) { await jump.click(); await page.waitForTimeout(1200); await page.getByRole("button", { name: "Close director panel" }).click(); await audit("after-hangout"); }
    for (let i = 0; i < 4; i++) { const y = page.getByRole("button", { name: /^(Yes|Loved it|Next|I went|Check in)$/ }).or(page.getByRole("radio", { name: /^(Yes|Loved it)$/ })).filter({ visible: true }).first(); if (!(await y.isVisible().catch(() => false))) break; await y.click(); await page.waitForTimeout(900); await audit(`checkin-${i}`); }
    await page.goto(`${base}/app/plans?mode=live`, { waitUntil: "load" }); await audit("plans-live");
  } catch (e) { console.log("ERR", k, e.message.slice(0, 300)); await audit("ERR"); }
  await ctx.close();
}
await b.close();
console.log(issues.join("\n"));
