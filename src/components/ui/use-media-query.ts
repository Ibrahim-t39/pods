// [U1] useMediaQuery: ONLY for choosing sheet vs dialog (ARCHITECTURE §6). Layout itself stays pure CSS.
// Server / first paint returns `fallback` (no window read during prerender).
"use client";

import { useCallback, useSyncExternalStore } from "react";

export function useMediaQuery(query: string, fallback = false): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

/** ≥ md (768px): dialogs instead of bottom sheets. */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 768px)");
}
