// Judge path: the demo video's Scene 5 walked end to end in a fresh browser, plus a Live smoke (PLATFORM_SPEC §O admin).
//
// DEMO (the Chanda world, ?mode=demo), at 390x844 and 1440x900:
//   landing → first run (Chanda, 22 · basketball + guitar · Zambian + Seventh-day Adventist · free times · number +
//   code · promise · check) → "Finding your pods" → Home (beats 1-3) → Hoopers: the plan card on top (beat 4) →
//   its details: the plan, what to bring, rain (beat 5) → "I'm in" ticks 3 of 8 → 4 of 8, "Locked" (beat 6) →
//   Director jump → check in → run it back, the pod votes (beat 7) → safety, privacy → admin.
// LIVE (?mode=live): a fresh account through the same first run → every pod I was placed in has a plan
//   (a suggestion or a hangout) in the Live world (localStorage "pods:live:v1"); the Demo world is untouched.
//
// Hard steps fail the run (exit 1). Soft steps (report and block sheets, the post-hangout loop details that other
// areas are still reshaping) print WARN and keep going, so one moving label never hides the rest of the path.
//
// Usage: node scripts/judge-path.mjs [baseUrl] [--only=mobile|desktop] [--mode=demo|live] [--ignore=<console regex>]
// Writes shots/path/<mode>-<viewport>/<NN>-<step>.png.
import { chromium } from "playwright";
import { mkdirSync, rmSync } from "node:fs";

const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const argv = process.argv.slice(2);
const base = argv.find((a) => a.startsWith("http")) ?? "http://localhost:3000";
const only = argv.find((a) => a.startsWith("--only="))?.slice(7);
const onlyMode = argv.find((a) => a.startsWith("--mode="))?.slice(7);
const VIEWPORTS = {
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
// Known-benign console noise (dev-only tooling), never app errors.
const IGNORE = [/Download the React DevTools/i, /\[HMR\]/, /\[Fast Refresh\]/, /favicon/i];
// --ignore=<regex>: a diagnosis aid to see past one known console error (never use it to call a run green)
const extra = argv.find((a) => a.startsWith("--ignore="))?.slice(9);
if (extra) IGNORE.push(new RegExp(extra));
const PERSONA = { name: "Chanda", age: "22", likes: ["basketball", "guitar"], from: ["Southern African", "Zambian"], faith: "Seventh-day Adventist" };

const browser = await chromium.launch({ executablePath: CHROME });
let failed = false;
let warned = 0;

for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  if (only && only !== vpName) continue;
  for (const mode of ["demo", "live"]) {
    if (onlyMode && onlyMode !== mode) continue;
    await run(vpName, vp, mode);
  }
}
await browser.close();
console.log(`\n${failed ? "FAIL" : "PASS"}  judge path${warned ? ` (${warned} soft warnings)` : ""}`);
process.exit(failed ? 1 : 0);

async function run(vpName, vp, mode) {
  const dir = `shots/path/${mode}-${vpName}`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ ...vp, locale: "en-US", timezoneId: "America/Chicago" });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60_000);
  page.setDefaultNavigationTimeout(180_000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (!IGNORE.some((r) => r.test(t))) errors.push(`console: ${t}`);
  });
  const mobile = vpName === "mobile";
  const tag = `[${mode} ${vpName}]`;
  let n = 0;
  const wait = (ms) => page.waitForTimeout(ms);
  const shot = async (name) => {
    n += 1;
    const file = `${dir}/${String(n).padStart(2, "0")}-${name}.png`;
    await page.screenshot({ path: file });
    return file;
  };
  const vis = page.locator(":visible");
  const btn = (name, opts = {}) => page.getByRole("button", { name, exact: false, ...opts }).and(vis).first();
  const link = (name) => page.getByRole("link", { name }).and(vis).first();
  const text = (t) => page.getByText(t).and(vis).first();
  const dump = async () =>
    page.evaluate(() =>
      [...document.querySelectorAll("button,a,input,textarea,[role=button],[role=radio],[role=checkbox],[role=option],[role=switch]")]
        .filter((e) => e.offsetParent !== null || getComputedStyle(e).position === "fixed")
        .map((e) => `${e.tagName}${e.getAttribute("role") ? `(${e.getAttribute("role")})` : ""} "${(e.innerText || e.value || e.getAttribute("aria-label") || e.placeholder || "").replace(/\s+/g, " ").slice(0, 70)}"`)
        .join("\n"),
    );

  /** A hard step: a failure ends this run. `soft`: a failure is a warning and the run goes on. */
  const step = async (name, fn, { soft = false } = {}) => {
    const before = errors.length;
    try {
      let timer;
      await Promise.race([fn(), new Promise((_, rej) => (timer = setTimeout(() => rej(new Error("step timed out after 300s")), 300_000)))]).finally(() => clearTimeout(timer));
      await wait(350);
      const file = await shot(name);
      const errs = errors.slice(before);
      if (errs.length) throw new Error(errs.join("\n").slice(0, 1200));
      console.log(`${tag} ok   ${name}  ${file}`);
      return true;
    } catch (e) {
      await Promise.race([shot(`${name}-${soft ? "WARN" : "FAIL"}`), wait(8000)]).catch(() => {});
      const controls = (await Promise.race([dump(), wait(5000).then(() => "(dump timed out)")]).catch(() => "")).slice(0, 2500);
      if (soft) {
        warned++;
        console.log(`${tag} WARN ${name} @ ${page.url()}\n${String(e.message ?? e).slice(0, 600)}`);
        return false;
      }
      failed = true;
      console.log(`${tag} FAIL ${name} @ ${page.url()}\n${String(e.message ?? e).slice(0, 1500)}\n--- controls ---\n${controls}`);
      throw e;
    }
  };

  /** Read the current world's database from this browser (Demo "pods:v1", Live "pods:live:v1"). */
  const readDb = () =>
    page.evaluate((key) => {
      try {
        const raw = JSON.parse(localStorage.getItem(key) || "{}");
        return raw.state?.db ?? raw.db ?? null;
      } catch {
        return null;
      }
    }, mode === "live" ? "pods:live:v1" : "pods:v1");

  // ---- First run, shared by both modes ------------------------------------------------------------------------
  const firstRun = async ({ communities }) => {
    await step("start", async () => {
      await page.goto(`${base}/app?mode=${mode}`, { waitUntil: "load" });
      await page.waitForURL(/\/app\/(onboarding|welcome)/, { timeout: 120_000 });
      const start = btn(/^Get started$/);
      if (/welcome/.test(page.url()) && (await start.isVisible().catch(() => false))) await start.click();
      await page.waitForURL(/onboarding\/about/);
      await page.getByLabel("First name").waitFor();
    });
    await step("you", async () => {
      await page.getByLabel("First name").fill(PERSONA.name);
      await page.getByLabel("Age").fill(PERSONA.age);
      await btn(/^Next$/).click();
      await page.waitForURL(/onboarding\/interests/);
      await wait(600);
    });
    await step("likes", async () => {
      for (const like of PERSONA.likes) {
        const re = new RegExp(`^${like}$`, "i");
        for (let i = 0; i < 6 && !(await btn(re, { exact: false }).isVisible().catch(() => false)); i++) {
          await btn("More likes").click();
          await wait(500);
        }
        await btn(re).click();
        await wait(250);
      }
      await text(/Into basketball, guitar/i).waitFor();
    });
    if (communities) {
      await step("communities", async () => {
        await btn(/^Community pods$/).click();
        const sheet = page.getByRole("dialog").and(vis).first();
        await sheet.waitFor();
        for (const w of PERSONA.from) {
          await sheet.getByRole("button", { name: new RegExp(`^${w}$`) }).first().click();
          await wait(350);
        }
        await sheet.getByRole("button", { name: PERSONA.faith }).first().click();
        await wait(300);
      });
      await step("communities-done", async () => {
        await page.getByRole("dialog").and(vis).first().getByRole("button", { name: /^Done$/ }).click();
        await page.getByRole("dialog").and(vis).first().waitFor({ state: "hidden" }).catch(() => {});
        await text(/Zambian/).waitFor();
      });
    }
    await step("free", async () => {
      await btn(/^Next$/).click();
      await page.waitForURL(/onboarding\/availability/);
      await wait(600);
      await page.getByRole("button", { name: "Saturday" }).first().click();
      await page.getByRole("button", { name: "Sunday" }).first().click();
      await page.getByRole("button", { name: "Wednesday" }).first().click();
      await wait(400);
    });
    await step("seat", async () => {
      await btn(/^Next$/).click();
      await page.waitForURL(/onboarding\/account/);
      await page.getByPlaceholder(/555/).fill("2565550142");
      await btn(/^Send code$/).click();
      await page.locator("input[autocomplete='one-time-code']").waitFor();
      await wait(500);
    });
    await step("code", async () => {
      await page.locator("input[autocomplete='one-time-code']").fill("123456");
      await page.waitForURL(/onboarding\/pledge/, { timeout: 60_000 });
      await btn(/^I promise$/).waitFor();
    });
    await step("promise", async () => {
      await btn(/^I promise$/).click();
      await page.waitForURL(/\/app\/verify/, { timeout: 60_000 });
      await wait(500);
    });
    await step("check", async () => {
      // headless has no camera: the path without it
      const without = btn(/^Without the camera$/);
      if (await without.isVisible().catch(() => false)) await without.click();
      else await btn(/^Start$/).click();
      await page.waitForURL(/\/app\/placing/, { timeout: 90_000 });
    });
    await step("finding-your-pods", async () => {
      await text(/Finding your pods|Your pods/).waitFor();
      await wait(600);
    });
    await step("placed", async () => {
      await text(/^Your pods\.?$/).waitFor({ timeout: 90_000 });
      await wait(1200);
    });
    await step("home", async () => {
      // the reveal waits for the person: Continue (no auto-advance)
      const cont = btn(/^Continue$/);
      if (await cont.isVisible().catch(() => false)) await cont.click();
      await page.waitForURL(/\/app\/home/, { timeout: 60_000 });
      await wait(1800);
    });
  };

  try {
    if (mode === "live") {
      // ---------------------------------------------------------------- LIVE smoke
      await firstRun({ communities: false });
      await step("live-each-pod-has-a-plan", async () => {
        const db = await readDb();
        if (!db) throw new Error("no Live world in localStorage pods:live:v1");
        const me = db.me;
        const pods = (db.memberships || []).filter((m) => m.user_id === me && !m.left_at && m.activation !== "pending").map((m) => m.pod_id);
        if (!pods.length) throw new Error("placement put Chanda in no pod in Live");
        const planned = (id) =>
          Object.values(db.suggestions || {}).some((s) => s.pod_id === id && s.status !== "rejected") || Object.values(db.hangouts || {}).some((h) => h.pod_id === id);
        const missing = pods.filter((id) => !planned(id));
        if (missing.length) throw new Error(`pods without a plan in Live: ${missing.join(", ")}`);
        console.log(`${tag}      placed in ${pods.length} pods, each with a plan: ${pods.join(", ")}`);
        const demo = await page.evaluate(() => localStorage.getItem("pods:v1"));
        const mine = demo ? JSON.parse(demo).state?.db?.me : null;
        if (mine) throw new Error("the Live run wrote a signed-in account into the Demo world");
      });
      await step("live-pods", async () => {
        await page.goto(`${base}/app/pods`, { waitUntil: "load" });
        await wait(2000);
      });
      await step("live-admin", async () => {
        // admin is gated (OpsGate): the Live run never opened the Director, so it unlocks with ?admin=1
        await page.goto(`${base}/admin?admin=1`, { waitUntil: "load" });
        await page.getByRole("heading", { name: "Overview" }).waitFor();
        await wait(1500);
      });
      return;
    }

    // ------------------------------------------------------------------ DEMO path
    await step("landing", async () => {
      await page.goto(base + "/", { waitUntil: "load" });
      await wait(2500);
      await text(/Find your people/i).waitFor();
    });
    await step("landing-story", async () => {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.45));
      await wait(1500);
    });

    await firstRun({ communities: true });

    // beats 2-3 on Home / Your pods: interest and community pods, the widened Southern African pod
    await step("pods", async () => {
      await page.goto(`${base}/app/pods`, { waitUntil: "load" });
      await text(/Hoopers/).waitFor();
      await wait(1500);
    });
    await step("widened", async () => {
      const db = await readDb();
      const me = db?.me;
      const mine = (db?.memberships || []).filter((m) => m.user_id === me && !m.left_at).map((m) => db.pods[m.pod_id]);
      const widened = mine.find((p) => p?.widened_from);
      if (!widened) throw new Error(`no widened pod among ${mine.map((p) => p?.name).join(", ")}`);
      if (!/Southern African/i.test(widened.name)) throw new Error(`widened pod is ${widened.name}, not Southern African`);
    });

    // beat 4: Hoopers opens with its first hangout planned, the card on top
    await step("hoopers", async () => {
      await page.goto(`${base}/app/pods/pod_hoopers`, { waitUntil: "load" });
      await text(/Brahan Spring/).waitFor({ timeout: 120_000 });
      await text(/3 of 8/).waitFor();
      await wait(2500);
    });
    // beat 5: the details: the plan, what to bring, the rain backup
    await step("plan-details", async () => {
      const open = page.getByRole("link", { name: /details|Brahan Spring|Open the plan/i }).or(page.getByRole("button", { name: /details|Open the plan|Why this plan/i })).and(vis).first();
      await open.click();
      await text(/rain/i).waitFor({ timeout: 120_000 });
      await wait(1500);
    });
    await step("plan-details-scrolled", async () => {
      await text(/rain/i).scrollIntoViewIfNeeded();
      await wait(1200);
    });
    // beat 6: I'm in, 3 of 8 → 4 of 8, Locked
    await step("im-in", async () => {
      await page.keyboard.press("Escape");
      await wait(600);
      if (!/\/app\/pods\/pod_hoopers$/.test(page.url())) await page.goto(`${base}/app/pods/pod_hoopers`, { waitUntil: "load" });
      await text(/3 of 8/).waitFor();
      await btn(/^I'm in$/).click();
      await text(/4 of 8/).waitFor();
      await wait(600);
    });
    await step("locked", async () => {
      await text(/Locked/).waitFor({ timeout: 15_000 });
      await wait(2500);
    });

    // beat 7: after the hangout (Director), check in, run it back, the pod votes in the chat
    const panel = page.locator("[data-director-panel]");
    const openDirector = async () => {
      if (await panel.isVisible().catch(() => false)) return;
      const mark = page.locator("[data-mark]").and(vis).first();
      if (mobile && (await mark.isVisible().catch(() => false))) {
        // long-press the mark (700 ms, the hidden trigger); retried, a loaded machine can miss the first press
        for (let i = 0; i < 3 && !(await panel.isVisible().catch(() => false)); i++) {
          const box = await mark.boundingBox();
          const at = { clientX: box.x + box.width / 2, clientY: box.y + box.height / 2, pointerType: "touch", bubbles: true, isPrimary: true };
          await mark.dispatchEvent("pointerdown", at);
          await wait(1800);
          await mark.dispatchEvent("pointerup", at);
          await mark.dispatchEvent("click", at);
          await wait(400);
          if (!(await panel.isVisible().catch(() => false))) await page.keyboard.press("Escape");
        }
      }
      if (!(await panel.isVisible().catch(() => false))) await page.keyboard.press("Control+Period");
      await panel.waitFor();
      await wait(400);
    };
    const closeDirector = async () => {
      await page.getByRole("button", { name: "Close director panel" }).click();
      await panel.waitFor({ state: "hidden" });
    };
    await step("director", openDirector);
    await step("after-the-hangout", async () => {
      await page.getByTestId("dir-jump").click();
      await wait(1200);
      await closeDirector();
      await text(/Everything okay|Did you make it|Check in|I went/).waitFor({ timeout: 60_000 });
      await wait(800);
    });
    await step("check-in", async () => {
      // the check-in tap where the build shows one; the private "Everything okay?" comes first or after it
      const went = btn(/^(I went|Check in)$/);
      if (await went.isVisible().catch(() => false)) await went.click();
      const ok = page.getByRole("radio", { name: /^Yes$/ }).and(vis).first();
      if (await text(/Everything okay/).isVisible().catch(() => false)) await ok.click();
      await wait(1200);
    });
    await step("run-it-back", async () => {
      // the private questions after check-in ("Everything okay?", "Loved it", "Run it back?") vary by build: answer
      // whatever is asked, yes-ward, until the ballot is in
      for (let i = 0; i < 5; i++) {
        const ballot = page.getByRole("radiogroup", { name: /Run it back/i }).and(vis).first();
        if (await ballot.isVisible().catch(() => false)) {
          await ballot.getByRole("radio", { name: /^Yes/ }).click();
          break;
        }
        const yes = page.getByRole("button", { name: /^(Yes|Loved it|Next|Run it back)$/ }).or(page.getByRole("radio", { name: /^(Yes|Loved it)$/ })).and(vis).first();
        if (!(await yes.isVisible().catch(() => false))) break;
        await yes.click();
        await wait(900);
      }
      await wait(1200);
    }, { soft: true });
    await step("vote", async () => {
      await openDirector();
      await page.getByTestId("dir-checkin").click();
      await wait(800);
      await page.getByTestId("dir-reveal").click();
      await wait(1200);
      await closeDirector();
      // the reveal ("4 of 4 said yes", hangout #2), then the pod picks the time
      await text(/said yes|run it back/i).waitFor({ timeout: 45_000 });
      const pick = btn(/^Pick a time$/);
      if (await pick.isVisible().catch(() => false)) await pick.click();
      await wait(1200);
      const group = page.getByRole("radiogroup").and(vis).first();
      await group.waitFor({ timeout: 30_000 });
      await group.getByRole("radio").first().click();
      await wait(800);
      const vote = btn(/^Vote$/);
      if (await vote.isVisible().catch(() => false) && (await vote.isEnabled().catch(() => false))) await vote.click();
      await wait(1500);
    });
    await step("hangout-2", async () => {
      await text(/#2|Round two|Hangout #2|two weeks/i).waitFor({ timeout: 45_000 });
      await wait(2000);
    }, { soft: true });

    // safety and legal, then admin (reads the Demo world)
    await step("safety", async () => {
      await page.keyboard.press("Escape").catch(() => {});
      await page.goto(`${base}/app/safety`, { waitUntil: "load" });
      await page.getByRole("heading").first().waitFor();
      await wait(1500);
    });
    await step("privacy", async () => {
      await page.goto(base + "/privacy", { waitUntil: "load" });
      await page.getByRole("heading").first().waitFor();
      await wait(1200);
    });
    await step("admin-reports", async () => {
      await page.goto(base + "/admin/reports", { waitUntil: "load" });
      await page.getByRole("heading", { name: "Reports" }).waitFor();
      await wait(1500);
    });
    await step("admin-pods", async () => {
      await page.goto(base + "/admin/pods", { waitUntil: "load" });
      await page.getByRole("heading", { name: "Pods" }).waitFor();
      await wait(1200);
    });
    await step("admin-overview", async () => {
      await page.goto(base + "/admin", { waitUntil: "load" });
      await page.getByRole("heading", { name: "Overview" }).waitFor();
      await wait(1500);
    });
  } catch {
    /* logged in step() */
  } finally {
    await ctx.close();
  }
}
