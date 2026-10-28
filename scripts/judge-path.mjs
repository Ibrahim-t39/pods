// [Integration] BLUEPRINT §J1 judge path, end to end, at 390x844 and 1440x900.
// Usage: node scripts/judge-path.mjs [baseUrl] [--only=mobile|desktop] [--from=N]
// Writes shots/path/<viewport>/<NN>-<step>.png and exits 1 on any failed step or console/page error.
import { chromium } from "playwright";
import { mkdirSync, rmSync } from "node:fs";

const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const argv = process.argv.slice(2);
const base = argv.find((a) => a.startsWith("http")) ?? "http://localhost:3000";
const only = argv.find((a) => a.startsWith("--only="))?.slice(7);
// --resume: start at the Hoopers chat from the storage saved after "home" on a previous run (debugging aid).
const resume = argv.includes("--resume");
const VIEWPORTS = {
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
// Known-benign console noise (dev-only tooling), never app errors.
const IGNORE = [/Download the React DevTools/i, /\[HMR\]/, /\[Fast Refresh\]/];

const browser = await chromium.launch({ executablePath: CHROME });
let failed = false;

for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  if (only && only !== vpName) continue;
  const dir = `shots/path/${vpName}`;
  const stateFile = `shots/path/${vpName}.state.json`;
  if (!resume) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ ...vp, locale: "en-US", timezoneId: "America/Chicago", ...(resume ? { storageState: stateFile } : {}) });
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
  let n = 0;
  const wait = (ms) => page.waitForTimeout(ms);
  const shot = async (name) => {
    n += 1;
    const file = `${dir}/${String(n).padStart(2, "0")}-${name}.png`;
    await page.screenshot({ path: file });
    return file;
  };
  const btn = (name, opts = {}) => page.getByRole("button", { name, exact: false, ...opts }).and(page.locator(":visible")).first();
  const link = (name) => page.getByRole("link", { name }).and(page.locator(":visible")).first();
  const text = (t) => page.getByText(t).and(page.locator(":visible")).first();
  const dump = async () =>
    page.evaluate(() =>
      [...document.querySelectorAll("button,a,input,textarea,[role=button],[role=radio],[role=checkbox],[role=option],[role=switch]")]
        .filter((e) => e.offsetParent !== null || getComputedStyle(e).position === "fixed")
        .map((e) => `${e.tagName}${e.getAttribute("role") ? `(${e.getAttribute("role")})` : ""} "${(e.innerText || e.value || e.getAttribute("aria-label") || e.placeholder || "").replace(/\s+/g, " ").slice(0, 70)}"`)
        .join("\n"),
    );

  let skipping = resume;
  const step = async (name, fn) => {
    if (skipping && name === "hoopers-chat") {
      skipping = false;
      n = 25;
      await page.goto(base + "/app/pods", { waitUntil: "load" });
    }
    if (skipping) return;
    const before = errors.length;
    try {
      let timer;
      await Promise.race([fn(), new Promise((_, rej) => (timer = setTimeout(() => rej(new Error("step timed out after 420s")), 420_000)))]).finally(() => clearTimeout(timer));
      await wait(350);
      const file = await shot(name);
      const errs = errors.slice(before);
      if (errs.length) throw new Error(errs.join("\n").slice(0, 1200));
      console.log(`[${vpName}] ok   ${name}  ${file}`);
    } catch (e) {
      failed = true;
      await Promise.race([shot(`${name}-FAIL`), wait(8000)]).catch(() => {});
      console.log(`[${vpName}] FAIL ${name} @ ${page.url()}\n${String(e.message ?? e).slice(0, 1500)}\n--- controls ---\n${(await Promise.race([dump(), wait(5000).then(() => "(dump timed out)")]).catch(() => "")).slice(0, 3000)}`);
      throw e;
    }
  };

  try {
    // 1. Landing (fresh device)
    await step("landing", async () => {
      // A fresh browser context has empty storage, so this is a first visit.
      await page.goto(base + "/", { waitUntil: "load" });
      await wait(2500);
      await text(/Find your people/i).waitFor();
    });
    await step("landing-how", async () => {
      await page.locator("#how, [id*=how]").first().scrollIntoViewIfNeeded();
      await wait(1200);
    });

    // 2. Welcome -> City -> Interests
    await step("welcome", async () => {
      await page.goto(base + "/app", { waitUntil: "load" });
      await page.waitForURL(/\/app\/welcome/);
      await btn("Get started").waitFor();
    });
    await step("city", async () => {
      await btn("Get started").click();
      await page.waitForURL(/onboarding\/city/);
      await page.getByRole("radio", { name: /^Huntsville/ }).click();
    });
    await step("interests", async () => {
      await btn("Continue").click();
      await page.waitForURL(/onboarding\/interests/);
      await wait(600);
      for (const i of ["Basketball", "Guitar"]) await page.getByRole("checkbox", { name: new RegExp(i, "i") }).click();
    });
    await step("account", async () => {
      await btn("Continue").click();
      await page.waitForURL(/onboarding\/account/);
      await wait(800);
      await page.getByPlaceholder(/555/).fill("2565550142");
    });
    await step("otp", async () => {
      await btn("Send code").click();
      await wait(1200);
      await page.locator("input").and(page.locator(":visible")).first().click();
      await page.keyboard.type("123456", { delay: 40 });
      await wait(400);
    });
    await step("about", async () => {
      const c = btn(/^Continue$/);
      if (await c.isEnabled().catch(() => false)) await c.click().catch(() => {});
      await page.waitForURL(/onboarding\/about/);
      await wait(800);
      await page.getByLabel("First name").fill("Chanda");
    });
    await step("birthday", async () => {
      await btn(/^Continue$/).click();
      await page.getByPlaceholder("MM").fill("03");
      await page.getByPlaceholder("DD").fill("14");
      await page.getByPlaceholder("YYYY").fill("2004");
      await btn(/^Continue$/).click();
      await btn("That's right").waitFor();
    });
    await step("communities-consent", async () => {
      await btn("That's right").click();
      await page.waitForURL(/onboarding\/communities/);
      await wait(800);
      await page.getByRole("checkbox").first().click();
    });
    await step("communities-fields", async () => {
      await btn("Add my community").click();
      await page.getByPlaceholder(/Zambian/).fill("Zambia");
      await page.getByRole("option").filter({ hasText: /Zambia/ }).first().click();
      await page.getByPlaceholder(/Baptist/).fill("Adventist");
      await page.getByRole("option").filter({ hasText: /Adventist/ }).first().click();
    });
    await step("availability", async () => {
      await btn(/^Continue$/).click();
      await page.waitForURL(/onboarding\/availability/);
      await wait(800);
      await page.getByRole("checkbox", { name: /Weekday evenings/ }).click();
      await page.getByRole("checkbox", { name: /^Sunday/ }).click();
      await page.getByRole("group", { name: /Sunday times/ }).getByText("Afternoon").click();
      await page.getByRole("switch", { name: /Saturdays/ }).click().catch(() => page.getByText("Keep Saturdays free").click());
    });
    await step("photo", async () => {
      await btn(/^Continue/).click();
      await page.waitForURL(/onboarding\/photo/);
      await wait(600);
      await page.getByRole("radio", { name: "Avatar 3" }).click();
      await wait(600);
    });
    await step("pledge", async () => {
      await btn(/^Continue$/).click();
      await page.waitForURL(/onboarding\/pledge/);
      await btn("I agree").waitFor();
    });
    await step("placing", async () => {
      await btn("I agree").click();
      await page.waitForURL(/\/app\/placing/);
      await wait(1500);
    });
    await step("preview-locked", async () => {
      await text(/4 pods are ready for you/i).waitFor({ timeout: 20_000 });
      await wait(800);
    });
    await step("verify-explain", async () => {
      await btn("Verify to join").click();
      await page.waitForURL(/\/app\/verify/);
      await btn(/^Start$/).waitFor();
    });
    await step("verify-consent", async () => {
      await btn(/^Start$/).click();
      await btn("Yes, compare automatically").waitFor();
      await page.getByRole("checkbox").first().click();
    });
    await step("verify-idtype", async () => {
      await btn("Yes, compare automatically").click();
      await page.getByRole("radio").first().click();
    });
    await step("verify-capture", async () => {
      await btn(/^Continue$/).click();
      await btn("Use sample ID").waitFor();
      await wait(600);
    });
    await step("verify-selfie", async () => {
      await btn("Use sample ID").click();
      await btn("Use sample selfie").waitFor();
      await wait(600);
    });
    await step("verify-processing", async () => {
      await btn("Use sample selfie").click();
      await wait(900);
    });
    await step("verify-success", async () => {
      await btn("See your pods").waitFor({ timeout: 20_000 });
      await wait(800);
    });
    await step("reveal", async () => {
      await btn("See your pods").click();
      await page.waitForURL(/\/app\/placing/);
      await link("Meet your pods").waitFor({ timeout: 25_000 });
      await text(/Southern African/).waitFor();
      await wait(2500);
    });
    await step("home", async () => {
      await link("Meet your pods").click();
      await page.waitForURL(/\/app\/pods$/);
      await page.locator("main").first().waitFor();
      await wait(1500);
      await ctx.storageState({ path: stateFile });
    });
    await step("hoopers-chat", async () => {
      await page.getByRole("link", { name: /Hoopers/ }).and(page.locator(":visible")).first().click();
      await page.waitForURL(/\/app\/pods\/pod_hoopers/);
      await text(/Sunday pickup run at Brahan Spring/).waitFor();
      await wait(2500);
    });
    await step("plan-details", async () => {
      await page.getByRole("link", { name: "See details" }).first().click();
      await page.getByRole("heading", { name: "Why this plan" }).waitFor({ timeout: 180_000 });
      await wait(1200);
    });
    await step("plan-trace", async () => {
      const why = btn("Why this plan");
      if ((await why.getAttribute("aria-expanded")) !== "true") await why.click();
      await btn("How Pods planned this").click();
      await text(/How Pods planned this/).scrollIntoViewIfNeeded();
      await wait(4500);
    });
    await step("im-in", async () => {
      await page.keyboard.press("Escape");
      await wait(600);
      if (/\/plan\//.test(page.url())) {
        await page.goBack();
        await page.waitForURL(/\/app\/pods\/pod_hoopers$/);
      }
      await wait(1200);
      await btn(/^I'm in$/).click();
      await text(/4 of 8 in/).waitFor();
      await wait(600);
    });
    await step("locked", async () => {
      await text(/Locked/).waitFor({ timeout: 15_000 });
      await wait(2500);
    });

    // 12. Director jump -> check-in -> run-it-back -> vote -> hangout #2 locked
    const openDirector = async () => {
      if (await page.locator("[data-director-panel]").isVisible().catch(() => false)) return;
      if (mobile) {
        // Long-press the mark (700 ms; v3 hidden trigger). Retried: on a loaded machine the first press can miss.
        // Pages without the mark fall back to Ctrl + . below.
        const bar = page.locator("[data-mark]").first();
        if (!(await bar.isVisible().catch(() => false))) { await page.keyboard.press("Control+Period"); await page.locator("[data-director-panel]").waitFor(); return; }
        for (let i = 0; i < 3; i++) {
          const box = await bar.boundingBox();
          const at = { clientX: box.x + box.width / 2, clientY: box.y + box.height / 2, pointerType: "touch", bubbles: true, isPrimary: true };
          await bar.dispatchEvent("pointerdown", at);
          await wait(1800);
          await bar.dispatchEvent("pointerup", at);
          await bar.dispatchEvent("click", at);
          if (await page.locator("[data-director-panel]").isVisible().catch(() => false)) break;
          await page.keyboard.press("Escape");
          await wait(500);
        }
      } else {
        await page.keyboard.press("Control+Period");
      }
      await page.locator("[data-director-panel]").waitFor();
      await wait(400);
    };
    const closeDirector = async () => {
      await page.getByRole("button", { name: "Close director panel" }).click();
      await page.locator("[data-director-panel]").waitFor({ state: "hidden" });
    };
    await step("director", async () => {
      await openDirector();
    });
    await step("director-jump", async () => {
      await page.getByTestId("dir-jump").click();
      await wait(1200);
      await closeDirector();
      await text(/Did you make it/).waitFor({ timeout: 60_000 });
      await wait(800);
    });
    await step("check-in", async () => {
      const went = btn(/^I went$/);
      if (await went.isVisible().catch(() => false)) await went.click();
      else await btn(/^Check in$/).last().click();
      await wait(800);
      if (!(await text("Glad you made it.").isVisible().catch(() => false)) && (await went.isVisible().catch(() => false))) await went.click();
      await text("Glad you made it.").waitFor();
      await page.getByRole("radio", { name: "Loved it" }).or(page.getByRole("checkbox", { name: "Loved it" })).first().click();
      await wait(600);
    });
    await step("ballot", async () => {
      await btn(/^Next$/).click();
      await page.getByRole("radiogroup", { name: /Run it back/ }).first().waitFor();
      await wait(600);
    });
    await step("ballot-answered", async () => {
      await page.getByRole("radiogroup", { name: /Run it back/ }).first().getByRole("radio", { name: /^Yes/ }).click();
      await wait(1500);
    });
    await step("run-it-back-reveal", async () => {
      await page.keyboard.press("Escape").catch(() => {});
      await openDirector();
      await page.getByTestId("dir-checkin").click();
      await wait(800);
      await page.getByTestId("dir-reveal").click();
      await wait(1200);
      await closeDirector();
      await text(/want to run it back/i).waitFor({ timeout: 30_000 });
      await wait(1500);
    });
    await step("vote", async () => {
      const group = page.getByRole("radiogroup", { name: /Pick the next one|Options for the next hangout/ }).and(page.locator(":visible")).first();
      await group.waitFor({ timeout: 45_000 });
      await group.getByRole("radio").first().click();
      await wait(1200);
    });
    await step("hangout-2-locked", async () => {
      await text(/Round two/i).waitFor({ timeout: 45_000 });
      await wait(2500);
    });
    await step("hangout-2-card", async () => {
      const close = btn("Back to the pod");
      if (await close.isVisible().catch(() => false)) await close.click();
      await page.keyboard.press("Escape").catch(() => {});
      await wait(1500);
    });

    // 13. Report sheet + Block sheet from a member message
    const memberMsg = page.locator(".group\\/msg").filter({ hasText: /Sunday run|Welcome/ }).and(page.locator(":visible")).first();
    const openMsgActions = async () => {
      await memberMsg.scrollIntoViewIfNeeded();
      if (mobile) {
        const box = await memberMsg.boundingBox();
        const at = { clientX: box.x + box.width / 2, clientY: box.y + box.height / 2, pointerType: "touch", bubbles: true, isPrimary: true };
        await memberMsg.dispatchEvent("pointerdown", at);
        await wait(700);
        await memberMsg.dispatchEvent("pointerup", at);
      } else {
        await memberMsg.hover();
        await memberMsg.getByRole("button", { name: "More actions" }).click();
      }
      await wait(500);
    };
    await step("report-sheet", async () => {
      await openMsgActions();
      await page.getByRole(mobile ? "button" : "menuitem", { name: "Report a concern" }).and(page.locator(":visible")).first().click();
      await text(/Unsafe or made me feel unsafe/).waitFor();
      await text(/Unsafe or made me feel unsafe/).click();
      await wait(800);
    });
    await step("block-sheet", async () => {
      await page.keyboard.press("Escape");
      await wait(800);
      await openMsgActions();
      await page.getByRole(mobile ? "button" : "menuitem", { name: /^Block/ }).and(page.locator(":visible")).first().click();
      await wait(1200);
    });

    // 14. Privacy page + Safety center
    await step("privacy", async () => {
      await page.keyboard.press("Escape");
      await page.goto(base + "/privacy", { waitUntil: "load" });
      await page.getByRole("heading").first().waitFor();
      await wait(1500);
    });
    await step("safety-center", async () => {
      await page.goto(base + "/app/settings/safety", { waitUntil: "load" });
      await wait(2500);
    });

    // 15. Admin dashboard + reports queue
    await step("admin", async () => {
      await page.goto(base + "/admin", { waitUntil: "load" });
      await text(/Synthetic demo data/).waitFor();
      await wait(2000);
    });
    await step("admin-reports", async () => {
      await page.goto(base + "/admin/reports", { waitUntil: "load" });
      await wait(2500);
    });
  } catch {
    /* logged in step() */
  }
  await ctx.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
