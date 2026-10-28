// [U11] Service worker registration + online status (ARCHITECTURE §13). Client-only: call after mount.
"use client";

import { useSyncExternalStore } from "react";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "dev";

/**
 * Register /sw.js?v={BUILD_ID}. In `next dev` the worker is off unless the URL has ?sw=1 (a stale worker fights HMR).
 * Never throws; returns null when unsupported or skipped.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  try {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
    const isDev = process.env.NODE_ENV !== "production";
    const forced = new URLSearchParams(window.location.search).has("sw");
    if (isDev && !forced) return null;
    const reg = await navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(BUILD_ID)}`, {
      scope: "/",
      updateViaCache: "none",
    });
    reg.addEventListener("updatefound", () => {
      const next = reg.installing;
      next?.addEventListener("statechange", () => {
        // A new build is waiting behind an old one: take over now so the next navigation is fresh.
        if (next.state === "installed" && navigator.serviceWorker.controller) next.postMessage({ type: "SKIP_WAITING" });
      });
    });
    return reg;
  } catch {
    return null;
  }
}

// ── online / offline ────────────────────────────────────────────────────
function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/**
 * true unless the browser reports offline. Server and first client render say true (no flash of banner),
 * then the real value is read after hydration. U5's OfflineBanner renders when this is false.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

/** Run `fn` each time the browser comes back online (e.g. flush queued sends). Returns an unsubscribe. */
export function onReconnect(fn: () => void): () => void {
  window.addEventListener("online", fn);
  return () => window.removeEventListener("online", fn);
}
