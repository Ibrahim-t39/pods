// [U3] Demo-aware clock (ARCHITECTURE §11, BLUEPRINT J5).
// now = db.clock.virtual_at + (Date.now() - db.clock.real_at); the store re-stamps real_at at boot, so a fresh load
// always starts at the stored virtual time (the anchor Wed Nov 4, 09:00 PT, or the last Director jump).
// Server / prerender / before hydration: returns the virtual time exactly (no Date.now()), so renders are deterministic.
"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/db/store";
import type { ISODateTime } from "@/lib/types";
import { jumpedClock, virtualNowMs } from "./clock-core";
import { TZ, toSeattleISO } from "./tz";

export { TZ, toSeattleISO };

/** Epoch ms of the demo "now". */
export function nowMs(): number {
  const { db, hydrated } = useStore.getState();
  return virtualNowMs(db.clock, hydrated && typeof window !== "undefined", Date.now());
}

export function now(): Date {
  return new Date(nowMs());
}

export function nowISO(): ISODateTime {
  return toSeattleISO(nowMs());
}

/** Director: move the demo clock to `iso` (e.g. DEMO.directorJump.at). Syncs to other tabs via the store. */
export function jumpTo(iso: ISODateTime) {
  const next = jumpedClock(iso, Date.now());
  useStore.getState().commit((d) => {
    d.clock = next;
  });
}

/** Move the demo clock forward (or back) by `ms` from the current demo now. */
export function jumpBy(ms: number) {
  jumpTo(toSeattleISO(nowMs() + ms));
}

/**
 * Re-renders every `intervalMs` (default 30 s), immediately when the clock jumps (the clock slice changes), and when
 * the tab becomes visible again. Returns the demo now.
 */
export function useClock(intervalMs = 30_000): Date {
  const clock = useStore((s) => s.db.clock);
  const hydrated = useStore((s) => s.hydrated);
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    const id = setInterval(bump, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") bump();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);
  void clock;
  void hydrated;
  return now();
}
