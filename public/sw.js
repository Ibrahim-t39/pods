/* [U11] Pods service worker (ARCHITECTURE §13). Hand-written, no dependencies.
 * Cache name pods-v{BUILD_ID}: the build id arrives as ?v= on the registration URL, so each deploy busts the old cache.
 * - install: precache /offline, the app shell routes and brand SVGs (each URL independently, one failure never blocks install)
 * - fetch: /_next/static, fonts, /brand, /icons, /avatars, /pods = cache-first; navigations + RSC = network-first (3 s), then cache, then /offline;
 *          /api/* = network-only (the planner has its own client fallback)
 * - activate: delete old caches, claim clients
 * - notificationclick: focus or open data.href
 */
const BUILD_ID = new URL(self.location.href).searchParams.get("v") || "dev";
const CACHE = "pods-v" + BUILD_ID;
const NETWORK_TIMEOUT_MS = 3000;
const PRECACHE = [
  "/offline",
  "/app",
  "/app/pods",
  "/app/events",
  "/app/profile",
  "/brand/mark.svg",
  "/brand/wordmark.svg",
  "/brand/logo-horizontal.svg",
  "/icons/icon-192.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        PRECACHE.map((url) =>
          fetch(url, { credentials: "same-origin" })
            .then((res) => (res.ok && !res.redirected ? cache.put(url, res) : undefined))
            .catch(() => undefined),
        ),
      ),
    ),
  );
  // Take over on next load; the page decides when to activate immediately via SKIP_WAITING.
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("pods-v") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/avatars/") ||
    url.pathname.startsWith("/pods/") ||
    /\.(?:woff2?|ttf|otf)$/.test(url.pathname)
  );
}

function cacheable(res) {
  return res && res.ok && res.status === 200 && !res.redirected && res.type !== "opaque";
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (cacheable(res)) cache.put(request, res.clone());
  return res;
}

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
}

async function networkFirst(request, { navigate }) {
  const cache = await caches.open(CACHE);
  // Navigations key on the path only (query strings like ?source=pwa share one entry).
  const url = new URL(request.url);
  const key = navigate ? url.origin + url.pathname : request;
  try {
    const res = await Promise.race([fetch(request), timeout(NETWORK_TIMEOUT_MS)]);
    if (cacheable(res)) cache.put(key, res.clone());
    return res;
  } catch (e) {
    const hit = (await cache.match(key)) || (await cache.match(request, { ignoreSearch: true }));
    if (hit) return hit;
    if (navigate) {
      const offline = await cache.match("/offline");
      if (offline) return offline;
    }
    return new Response("Offline", { status: 503, statusText: "Offline", headers: { "Content-Type": "text/plain" } });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // network-only
  if (url.pathname === "/sw.js") return;
  // Dev server assets (HMR, turbopack) must never be cached.
  if (url.pathname.startsWith("/_next/") && !url.pathname.startsWith("/_next/static/")) return;
  // Dev builds: chunks change without a new build id, so keep them network-first (still available offline).
  if (BUILD_ID === "dev" && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(networkFirst(request, { navigate: false }));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request).catch(() => Response.error()));
    return;
  }
  const isRsc = request.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
  if (request.mode === "navigate" || isRsc) {
    event.respondWith(networkFirst(request, { navigate: request.mode === "navigate" }));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = (event.notification.data && event.notification.data.href) || "/app";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          if ("navigate" in c) c.navigate(href).catch(() => undefined);
          return c.focus();
        }
      }
      return self.clients.openWindow(href);
    }),
  );
});
