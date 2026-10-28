// Shared config for the v3 gates (DESIGN.md §11, docs/design/template.md §6). One place for routes, word budgets,
// banned wording and the browser, so check-product-gates.mjs and check-ui-basics.mjs judge the same screens.
//
// Word budgets mirror DESIGN.md §8 "Copy budgets". `cap` is the budget; the gate WARNS (human review) when a screen
// is far outside it: words > cap * 1.5, or fewer than `min` (a screen with no words to act on is cold). Chat, data
// (names, initials, times inside a table) and anything marked [data-nc] are not counted.

export const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;

export const VIEWPORTS = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  laptop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};

/** auth: "none" = fresh browser; "me" = signed in and placed (via the hidden Director, the way judge-path does it). */
export const ROUTES = [
  // marketing
  { path: "/", auth: "none", cap: 15, min: 3, kind: "flow" },
  { path: "/privacy", auth: "none", cap: 40, min: 3, kind: "content" },
  { path: "/safety", auth: "none", cap: 40, min: 3, kind: "content" },
  { path: "/terms", auth: "none", cap: 30, min: 3, kind: "content" },
  { path: "/waitlist", auth: "none", cap: 15, min: 3, kind: "flow" },
  // first run (fresh browser)
  { path: "/app/welcome", auth: "none", cap: 15, min: 2, kind: "flow" },
  { path: "/app/onboarding/city", auth: "none", cap: 15, min: 2, kind: "flow", allowCity: true },
  { path: "/app/onboarding/interests", auth: "none", cap: 20, min: 2, kind: "flow" },
  { path: "/app/onboarding/communities", auth: "none", cap: 22, min: 2, kind: "flow" },
  { path: "/app/onboarding/account", auth: "none", cap: 15, min: 2, kind: "flow" },
  { path: "/app/onboarding/about", auth: "none", cap: 15, min: 2, kind: "flow" },
  { path: "/app/onboarding/availability", auth: "none", cap: 15, min: 2, kind: "flow" },
  { path: "/app/onboarding/photo", auth: "none", cap: 15, min: 2, kind: "flow" },
  { path: "/app/onboarding/pledge", auth: "none", cap: 15, min: 2, kind: "flow" },
  // signed in
  { path: "/app/pods", auth: "me", cap: 18, min: 2, kind: "flow" },
  { path: "/app/pods/pod_hoopers", auth: "me", cap: 26, min: 2, kind: "flow" },
  { path: "/app/pods/pod_hoopers/details", auth: "me", cap: 24, min: 2, kind: "sheet" },
  { path: "/app/pods/pod_hoopers/plan/sug_hoopers_1", auth: "me", cap: 26, min: 2, kind: "flow" },
  { path: "/app/events", auth: "me", cap: 18, min: 2, kind: "flow" },
  { path: "/app/inbox", auth: "me", cap: 30, min: 1, kind: "content" },
  { path: "/app/profile", auth: "me", cap: 24, min: 2, kind: "content" },
  { path: "/app/profile/edit", auth: "me", cap: 30, min: 2, kind: "content" },
  { path: "/app/settings", auth: "me", cap: 24, min: 2, kind: "content" },
  { path: "/app/settings/account", auth: "me", cap: 24, min: 2, kind: "content" },
  { path: "/app/settings/notifications", auth: "me", cap: 15, min: 2, kind: "content" },
  { path: "/app/settings/privacy", auth: "me", cap: 32, min: 2, kind: "content" },
  { path: "/app/settings/safety", auth: "me", cap: 30, min: 2, kind: "content" },
  { path: "/app/people/:member", auth: "me", cap: 15, min: 2, kind: "sheet" },
  // admin (ops tool: data-heavy, counted with a larger budget)
  { path: "/admin", auth: "me", cap: 40, min: 2, kind: "admin" },
  { path: "/admin/reports", auth: "me", cap: 40, min: 2, kind: "admin" },
  { path: "/admin/pods", auth: "me", cap: 40, min: 2, kind: "admin" },
  { path: "/admin/hangouts", auth: "me", cap: 40, min: 2, kind: "admin" },
  // system
  { path: "/offline", auth: "none", cap: 15, min: 2, kind: "flow" },
  { path: "/this-page-does-not-exist", auth: "none", cap: 15, min: 2, kind: "flow" },
];

/** Rule 4 (zero disclaimers). Whole words, case-insensitive, anywhere visible, admin and Director included. */
export const BANNED = /\b(demo|demos|sample|samples|simulat\w*|pilot|pilots|prototype|synthetic|placeholder|launching|opening in|coming soon|beta|test data|fake)\b/i;

/** Rule 5 (no city in the product). Allowed only inside [data-allow-city] (a venue address, the one city picker). */
export const CITY = /\b(Huntsville|Alabama|Madison|Decatur|AAMU|A&M|Rocket City)\b/;

/** Invented proof: counts, testimonials, press. */
export const INVENTED = [
  /\b\d[\d,.]*\s*[kKmM]?\+?\s+(members|users|people|friends|pods)\s+(joined|already|and counting|strong)\b/i,
  /\b(trusted by|as seen (in|on)|featured in|testimonial|what (our )?(members|users) say|loved by)\b/i,
  /★|⭐/,
];

export const EM_DASH = /—/;

export const IGNORE_CONSOLE = [/Download the React DevTools/i, /\[HMR\]/, /\[Fast Refresh\]/, /favicon/i];

/** Text not counted as copy: chat, data rows, initials, the Director, hidden things. */
export const NOT_COPY = "[data-nc], [data-chat], [data-data], [data-director-panel], [aria-hidden='true'], script, style, noscript, nextjs-portal";

/** Visible copy of the page as one string (runs in the browser). */
export function readCopy(notCopy) {
  const skip = (el) => !!el.closest(notCopy);
  const out = [];
  const fold = [];
  const allow = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walk.nextNode()) {
    const n = walk.currentNode;
    const el = n.parentElement;
    if (!el || skip(el)) continue;
    const t = n.textContent.replace(/\s+/g, " ").trim();
    if (!t) continue;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (r.width === 0 || r.height === 0 || cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
    (el.closest("[data-allow-city]") ? allow : out).push(t);
    // above the fold = what a person reads before acting (word budgets count this)
    if (r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth) fold.push(t);
  }
  // labels of icon-only controls are copy too (screen readers read them)
  for (const b of document.querySelectorAll("button[aria-label], a[aria-label]")) {
    if (skip(b) || b.closest("[data-allow-city]")) continue;
    const r = b.getBoundingClientRect();
    if (r.width && r.height && !b.textContent.trim()) out.push(`[${b.getAttribute("aria-label")}]`);
  }
  return { copy: out.join(" "), fold: fold.join(" "), allowed: allow.join(" ") };
}

/** Sign in and get placed the way judge-path does: the hidden Director's "Skip to placed". */
export async function signIn(page, base) {
  await page.goto(`${base}/app/welcome?director=1`, { waitUntil: "load" });
  await page.locator("[data-director-panel]").waitFor({ timeout: 60_000 });
  await page.getByTestId("dir-skip").click();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Close director panel" }).click();
  await page.waitForTimeout(300);
  return page.evaluate(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("pods:v1") || "{}");
      const db = raw.state?.db ?? raw.db ?? raw.state ?? {};
      const me = db.me;
      const other = Object.keys(db.users || {}).find((id) => id !== me);
      return { me, member: other };
    } catch {
      return { me: null, member: null };
    }
  });
}

export function resolve(path, ids) {
  return path.replace(":member", ids.member ?? "unknown");
}
