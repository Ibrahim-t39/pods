// Platform §M: Demo / Live mode. Pure helpers + the device preference. No React, no store import (the store imports
// this). Demo = the scripted Chanda world (pinned clock, Director). Live = your own account on the real clock.
// Each mode keeps its own database under its own localStorage key, so switching never loses either one.
import type { AppMode } from "@/lib/types";

export type { AppMode };
export const MODES: readonly AppMode[] = ["demo", "live"] as const;
export const DEFAULT_MODE: AppMode = "demo";

/** Device preference key (outside both databases). */
export const MODE_KEY = "pods:mode";
/** Demo keeps the original key so existing rehearsal state survives this change. */
export const DB_KEYS: Record<AppMode, string> = { demo: "pods:v1", live: "pods:live:v1" };

export function isMode(v: unknown): v is AppMode {
  return v === "demo" || v === "live";
}

/** `?mode=demo|live` (any other value is ignored). */
export function modeFromSearch(search: string): AppMode | null {
  try {
    const v = new URLSearchParams(search).get("mode");
    return isMode(v) ? v : null;
  } catch {
    return null;
  }
}

export function readModePref(): AppMode | null {
  try {
    const v = typeof window !== "undefined" ? window.localStorage.getItem(MODE_KEY) : null;
    return isMode(v) ? v : null;
  } catch {
    return null;
  }
}

export function writeModePref(m: AppMode): void {
  try {
    window.localStorage.setItem(MODE_KEY, m);
  } catch {
    /* storage blocked: the mode lasts for this tab only */
  }
}

/** Which mode a fresh page load should open in: the URL wins, then the saved preference, then Demo. */
export function resolveInitialMode(search: string, saved: AppMode | null): AppMode {
  return modeFromSearch(search) ?? saved ?? DEFAULT_MODE;
}
