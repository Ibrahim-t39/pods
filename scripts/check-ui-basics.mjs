// UI basics gate (DESIGN.md §11; template.md §6). Renders every route in gates.config.mjs at 390x844 (phone) and
// 1440x900 (laptop) and FAILS (exit 1) on:
//   h1        not exactly one visible <h1> on the page
//   hscroll   horizontal scroll at 390 (document wider than the viewport)
//   target    a visible control under 44x44 (inline text links inside a sentence are exempt, WCAG 2.5.8)
//   overlap   two visible controls whose boxes overlap (neither inside the other)
//   console   a console error or page error (dev tooling noise ignored)
//   scroll    a flow step that scrolls at 390x844 (template.md: no scrolling on a flow step) -> WARN only
//
// Usage: node scripts/check-ui-basics.mjs [baseUrl] [--only=phone|laptop] [--route=/path]
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { CHROME, IGNORE_CONSOLE, ROUTES, VIEWPORTS, resolve, signIn } from "./gates.config.mjs";

const argv = process.argv.slice(2);
const base = argv.find((a) => a.startsWith("http")) ?? "http://localhost:3000";
const only = argv.find((a) => a.startsWith("--only="))?.slice(7);
const onlyRoute = argv.find((a) => a.startsWith("--route="))?.slice(8);

const browser = await chromium.launch({ executablePath: CHROME });
const results = [];
let fails = 0;
let warns = 0;
const log = (level, where, msg) => {
  results.push({ level, where, msg });
  if (level === "FAIL") fails++;
  if (level === "WARN") warns++;
  console.log(`${level.padEnd(5)} ${where}  ${msg}`);
};

/** Runs in the page: everything the checks need, in one pass. */
function inspect() {
  const SEL = "a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=link], [role=checkbox], [role=radio], [role=switch], [role=tab], [role=option], [role=menuitem], [tabindex='0']";
  const vis = (el) => {
    if (el.closest("[data-director-panel], nextjs-portal, [aria-hidden='true'], [inert]")) return false;
    // visually hidden until focused (skip links): not a target at rest
    const c0 = getComputedStyle(el);
    if (c0.clip === "rect(0px, 0px, 0px, 0px)" || c0.clipPath === "inset(50%)") return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0 || cs.pointerEvents === "none") return false;
    // off-screen (other snap beats, closed drawers)
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false;
    return true;
  };
  const h1 = [...document.querySelectorAll("h1")].filter((h) => {
    const r = h.getBoundingClientRect();
    const cs = getComputedStyle(h);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && !h.closest("[hidden], [aria-hidden='true']");
  }).length;
  const label = (el) => (el.getAttribute("aria-label") || el.innerText || el.value || el.getAttribute("placeholder") || el.tagName).replace(/\s+/g, " ").trim().slice(0, 40);
  const controls = [...document.querySelectorAll(SEL)].filter(vis);
  // a control nested in another control counts once (the outer one)
  const outer = controls.filter((el) => !controls.some((o) => o !== el && o.contains(el)));
  const isInline = (el) => {
    if (el.tagName !== "A") return false;
    const cs = getComputedStyle(el);
    if (!cs.display.startsWith("inline") || cs.display === "inline-flex" || cs.display === "inline-block") return false;
    const p = el.parentElement;
    return !!p && p.innerText.trim().length > el.innerText.trim().length + 3;
  };
  const small = outer
    .filter((el) => !isInline(el) && !(el.tagName === "INPUT" && ["checkbox", "radio"].includes(el.type) && el.closest("label")))
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.width < 43.5 || r.height < 43.5)
    .map(({ el, r }) => `${label(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  const boxes = outer.map((el) => ({ el, r: el.getBoundingClientRect() }));
  const overlaps = [];
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i].r;
      const b = boxes[j].r;
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w > 2 && h > 2) overlaps.push(`"${label(boxes[i].el)}" x "${label(boxes[j].el)}" ${Math.round(w)}x${Math.round(h)}`);
    }
  return {
    h1,
    scrollW: document.documentElement.scrollWidth,
    scrollH: document.documentElement.scrollHeight,
    vw: innerWidth,
    vh: innerHeight,
    small,
    overlaps,
  };
}

for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  if (only && only !== vpName) continue;
  for (const auth of ["none", "me"]) {
    const ctx = await browser.newContext({ ...vp, locale: "en-US", timezoneId: "America/Chicago" });
    const page = await ctx.newPage();
    page.setDefaultNavigationTimeout(180_000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const t = m.text();
      if (!IGNORE_CONSOLE.some((re) => re.test(t))) errors.push(`console: ${t}`);
    });
    let ids = { me: null, member: null };
    if (auth === "me") ids = await signIn(page, base);
    errors.length = 0;

    for (const r of ROUTES.filter((x) => x.auth === auth)) {
      if (onlyRoute && r.path !== onlyRoute) continue;
      const path = resolve(r.path, ids);
      const where = `${vpName.padEnd(6)} ${path}`;
      errors.length = 0;
      try {
        await page.goto(base + path, { waitUntil: "load" });
        await page.waitForTimeout(1400);
        const x = await page.evaluate(inspect);
        let ok = true;
        if (x.h1 !== 1) (ok = false), log("FAIL", where, `h1: ${x.h1} visible h1 elements (want 1)`);
        if (vpName === "phone" && x.scrollW > x.vw + 1) (ok = false), log("FAIL", where, `hscroll: document is ${x.scrollW}px wide at ${x.vw}`);
        if (x.small.length) (ok = false), log("FAIL", where, `target <44: ${x.small.slice(0, 6).join(" · ")}${x.small.length > 6 ? ` (+${x.small.length - 6})` : ""}`);
        if (x.overlaps.length) (ok = false), log("FAIL", where, `overlap: ${x.overlaps.slice(0, 4).join(" · ")}`);
        // the 404 route answers 404 by design
        const errs = path === "/this-page-does-not-exist" ? errors.filter((e) => !/status of 404/.test(e)) : errors;
        if (errs.length) (ok = false), log("FAIL", where, `console: ${errs.slice(0, 2).join(" | ").slice(0, 300)}`);
        if (vpName === "phone" && r.kind === "flow" && x.scrollH > x.vh + 1 && path !== "/") log("WARN", where, `flow step scrolls (${x.scrollH}px at ${x.vh})`);
        if (ok) log("PASS", where, `h1 1 · no hscroll · targets ok · no overlaps · no errors`);
      } catch (e) {
        log("FAIL", where, `did not render: ${String(e.message ?? e).split("\n")[0]}`);
      }
    }
    await ctx.close();
  }
}

await browser.close();
mkdirSync("shots/gates", { recursive: true });
writeFileSync("shots/gates/ui-basics.json", JSON.stringify(results, null, 2));
console.log(`\n${fails ? "FAIL" : "PASS"}  ui basics: ${fails} fail, ${warns} warn (report: shots/gates/ui-basics.json)`);
process.exit(fails ? 1 : 0);
