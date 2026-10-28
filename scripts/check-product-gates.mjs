// Product gate (Scelta's TEAM_WORDS gate, made stricter; DESIGN.md §11). Renders every route with Playwright at phone
// and laptop size, for a fresh browser and a signed-in one, and reads the visible copy.
//
// FAIL (exit 1):
//   rule 4  any disclaimer: demo, sample, simulated, pilot, prototype, synthetic, placeholder, launching, opening in...
//   rule 5  a city word (Huntsville, Alabama, Madison, Decatur, AAMU...) outside [data-allow-city]
//   proof   an invented count, testimonial, press line or star rating
//   copy    an em dash in visible copy
//   hidden  the Director visible without one of its triggers (?director=1, Ctrl/Cmd + ., 700 ms press on the mark);
//           or the Director failing to open with ?director=1; or banned words inside the Director
// WARN (human review, not a failure): a screen's word count far outside its budget in gates.config.mjs.
//
// Usage: node scripts/check-product-gates.mjs [baseUrl] [--only=phone|laptop] [--route=/path]
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { BANNED, CHROME, CITY, EM_DASH, INVENTED, NOT_COPY, ROUTES, VIEWPORTS, readCopy, resolve, signIn } from "./gates.config.mjs";

const argv = process.argv.slice(2);
const base = argv.find((a) => a.startsWith("http")) ?? "http://localhost:3000";
const only = argv.find((a) => a.startsWith("--only="))?.slice(7);
const onlyRoute = argv.find((a) => a.startsWith("--route="))?.slice(8);

const browser = await chromium.launch({ executablePath: CHROME });
const results = [];
let fails = 0;
let warns = 0;
const fail = (where, msg) => {
  fails++;
  results.push({ level: "FAIL", where, msg });
  console.log(`FAIL  ${where}  ${msg}`);
};
const warn = (where, msg) => {
  warns++;
  results.push({ level: "WARN", where, msg });
  console.log(`WARN  ${where}  ${msg}`);
};
const pass = (where, msg) => {
  results.push({ level: "PASS", where, msg });
  console.log(`PASS  ${where}  ${msg}`);
};
const words = (s) => s.split(/\s+/).filter((w) => /[A-Za-z]/.test(w) && !/^\[.*\]$/.test(w)).length;

for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  if (only && only !== vpName) continue;
  for (const auth of ["none", "me"]) {
    const ctx = await browser.newContext({ ...vp, locale: "en-US", timezoneId: "America/Chicago" });
    const page = await ctx.newPage();
    page.setDefaultNavigationTimeout(180_000);
    let ids = { me: null, member: null };
    if (auth === "me") ids = await signIn(page, base);

    for (const r of ROUTES.filter((x) => x.auth === auth)) {
      if (onlyRoute && r.path !== onlyRoute) continue;
      const path = resolve(r.path, ids);
      const where = `${vpName.padEnd(6)} ${path}`;
      try {
        await page.goto(base + path, { waitUntil: "load" });
        await page.waitForTimeout(1400);
        // hidden Director: never visible without a trigger
        if (await page.locator("[data-director-panel]").isVisible().catch(() => false)) fail(where, "Director visible without a trigger");
        const { copy, fold, allowed } = await page.evaluate(readCopy, NOT_COPY);
        const bad = copy.match(BANNED);
        if (bad) fail(where, `disclaimer word "${bad[0]}" in: …${around(copy, bad.index)}…`);
        const city = r.allowCity ? null : copy.match(CITY);
        if (city) fail(where, `city word "${city[0]}" outside [data-allow-city]: …${around(copy, city.index)}…`);
        for (const re of INVENTED) {
          const m = copy.match(re);
          if (m) fail(where, `invented proof "${m[0]}"`);
        }
        const dash = copy.match(EM_DASH);
        if (dash) fail(where, `em dash in copy: …${around(copy, dash.index)}…`);
        if (allowed && BANNED.test(allowed)) fail(where, "disclaimer word inside [data-allow-city]");
        const n = words(r.kind === "flow" ? fold : copy);
        if (n > r.cap * 1.5) warn(where, `${n} words, budget ${r.cap} (${r.kind}); review the rendered screen`);
        else if (n < r.min) warn(where, `${n} words, fewer than ${r.min}; is the next step clear?`);
        else pass(where, `${n}/${r.cap} words`);
      } catch (e) {
        fail(where, `did not render: ${String(e.message ?? e).split("\n")[0]}`);
      }
    }
    await ctx.close();
  }

  // Director: opens with ?director=1, and carries no disclaimer words either
  if (!onlyRoute) {
    const ctx = await browser.newContext({ ...vp });
    const page = await ctx.newPage();
    const where = `${vpName.padEnd(6)} director`;
    try {
      await page.goto(`${base}/app/welcome?director=1`, { waitUntil: "load" });
      await page.locator("[data-director-panel]").waitFor({ timeout: 30_000 });
      const t = await page.locator("[data-director-panel]").innerText();
      const bad = t.match(BANNED);
      if (bad) fail(where, `disclaimer word "${bad[0]}" inside the Director`);
      else pass(where, "opens with ?director=1, no disclaimer words");
      await page.getByRole("button", { name: "Close director panel" }).click();
      await page.goto(`${base}/app/welcome`, { waitUntil: "load" });
      await page.waitForTimeout(800);
      if (await page.locator("[data-director-panel]").isVisible().catch(() => false)) fail(where, "Director stays open without a trigger");
      await page.keyboard.press(process.platform === "darwin" ? "Meta+." : "Control+.");
      await page.waitForTimeout(400);
      if (!(await page.locator("[data-director-panel]").isVisible().catch(() => false))) fail(where, "Ctrl/Cmd + . did not open the Director");
      else pass(where, "Ctrl/Cmd + . opens it");
    } catch (e) {
      fail(where, `Director check failed: ${String(e.message ?? e).split("\n")[0]}`);
    }
    await ctx.close();
  }
}

function around(s, i) {
  return s.slice(Math.max(0, i - 40), i + 40);
}

await browser.close();
mkdirSync("shots/gates", { recursive: true });
writeFileSync("shots/gates/product-gates.json", JSON.stringify(results, null, 2));
console.log(`\n${fails ? "FAIL" : "PASS"}  product gates: ${fails} fail, ${warns} warn (report: shots/gates/product-gates.json)`);
process.exit(fails ? 1 : 0);
