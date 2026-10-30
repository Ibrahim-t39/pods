// Groove concept state. Seeded from the real seed (data.ts); writes stay local to this concept so the main app's
// store is never touched. Persisted to localStorage "pods:groove:v1" and rehydrated after mount (never in prerender).
"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Slot } from "@/lib/types";
import { HOOPERS, ROOTS_POD, podForInterest, starter, venue } from "./data";

export const ME = "me";

export interface Snap {
  round: number;
  summary: string;
  event: string;
  startsAt: string;
  endsAt: string;
  venueId: string;
  rain: string;
  reason: string;
  weather: string | null;
  source: "claude" | "seed" | "fallback" | "local";
}

export interface PodRec {
  id: string;
  /** done hangouts, #1 innermost */
  history: { round: number; came: number; startsAt: string }[];
  round: number;
  plan: Snap | null;
  /** people in for the current round (user ids, ME for you) */
  inn: string[];
  /** seeded people who were already in before you arrived; they drop in after the cut */
  waiting: string[];
  locked: boolean;
  /** run-it-back pulls on the last hangout */
  pulls: string[];
}

interface S {
  hydrated: boolean;
  name: string;
  interests: string[];
  slots: Slot[];
  roots: string;
  pressed: boolean;
  pods: string[];
  recs: Record<string, PodRec>;
  /** transient: the colour that is warping in or out */
  warp: { podId: string; dir: "in" | "out" } | null;
  set: (p: Partial<S>) => void;
  press: () => void;
  rec: (id: string) => PodRec;
  patch: (id: string, fn: (r: PodRec) => PodRec) => void;
  reset: () => void;
}

function initialRec(id: string): PodRec {
  const st = starter(id);
  // Strings arrives already cut (a plan with no one in yet); Hoopers and the community pod wait for the needle.
  const preCut = id !== HOOPERS && id !== ROOTS_POD && st;
  return {
    id,
    history: [],
    round: 1,
    plan: preCut ? snapFromPlan(st!.plan, 1, "seed", null) : null,
    inn: [],
    waiting: st?.going ?? [],
    locked: false,
    pulls: [],
  };
}

export function snapFromPlan(
  p: { summary: string; event: string; starts_at: string; ends_at: string; venue_id: string; rain_plan: string; reason: string },
  round: number,
  source: Snap["source"],
  weather: string | null,
): Snap {
  const fix = (s: string) => (/[+-]\d\d:\d\d$|Z$/.test(s) ? s : `${s}-08:00`);
  return {
    round,
    summary: p.summary,
    event: p.event,
    startsAt: fix(p.starts_at),
    endsAt: fix(p.ends_at),
    venueId: p.venue_id,
    rain: p.rain_plan,
    reason: p.reason,
    weather,
    source,
  };
}

const DEFAULT_PODS = [HOOPERS, "pod_rocket_city_strings", ROOTS_POD];

const blank = {
  name: "",
  interests: [] as string[],
  slots: [] as Slot[],
  roots: "",
  pressed: false,
  pods: DEFAULT_PODS,
  recs: {} as Record<string, PodRec>,
  warp: null,
};

export const useGroove = create<S>()(
  persist(
    (set, get) => ({
      hydrated: false,
      ...blank,
      set: (p) => set(p),
      press: () => {
        const s = get();
        const fromInterests = s.interests.map(podForInterest).filter((x): x is string => !!x).slice(0, 2);
        const pods = [...(fromInterests.length ? fromInterests : DEFAULT_PODS.slice(0, 2))];
        if (s.roots.trim() || !fromInterests.length) pods.push(ROOTS_POD);
        set({ pressed: true, pods: [...new Set(pods)] });
      },
      rec: (id) => get().recs[id] ?? initialRec(id),
      patch: (id, fn) => set((s) => ({ recs: { ...s.recs, [id]: fn(s.recs[id] ?? initialRec(id)) } })),
      reset: () => set({ ...blank, recs: {} }),
    }),
    {
      name: "pods:groove:v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ name: s.name, interests: s.interests, slots: s.slots, roots: s.roots, pressed: s.pressed, pods: s.pods, recs: s.recs }),
      onRehydrateStorage: () => () => useGroove.setState({ hydrated: true }),
    },
  ),
);

/** Boot the concept store after mount. Returns hydrated. */
export function useGrooveReady(): boolean {
  useEffect(() => {
    if (!useGroove.getState().hydrated) {
      try {
        void useGroove.persist.rehydrate();
      } catch {
        useGroove.setState({ hydrated: true });
      }
    }
  }, []);
  return useGroove((s) => s.hydrated);
}

export function usePodRec(id: string): PodRec {
  return useGroove((s) => s.recs[id]) ?? initialRec(id);
}

export function venueOf(snap: Snap | null) {
  return venue(snap?.venueId);
}
