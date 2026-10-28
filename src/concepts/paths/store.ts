// Paths concept state. Seeded from the real seed (data.ts); writes stay local to this concept so the shared store,
// seed and planner are never modified. Persisted to localStorage "pods:paths:v1", rehydrated after mount only.
"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Slot } from "@/lib/types";
import { HOOPERS, goingBefore, members, podForInterest, type Hue } from "./data";

export const ME = "me";

export interface Snap {
  summary: string;
  startsAt: string;
  endsAt: string;
  venueId: string;
  venueName: string;
  address: string;
  rain: string;
  reason: string;
  cost: string;
  sky: string | null;
}

export type Stage = "new" | "planning" | "plan" | "locked" | "after" | "vote" | "opening";

export interface Rec {
  id: string;
  hue: Hue;
  /** hangouts held: drives how worn the path is (never shown as a number) */
  walks: number;
  round: number;
  stage: Stage;
  plan: Snap | null;
  /** people in for this round (user ids, ME for you) */
  inn: string[];
  /** "run it back" yes answers (ids) */
  votes: string[];
  myVote: "yes" | "no" | null;
  /** the planner's visible work, max 6 rows */
  trace: { label: string; detail?: string }[];
}

interface S {
  hydrated: boolean;
  name: string;
  interests: string[];
  slots: Slot[];
  community: string | null;
  promised: boolean;
  arrived: boolean;
  pods: string[];
  recs: Record<string, Rec>;
  set: (p: Partial<S>) => void;
  settle: () => void;
  patch: (id: string, fn: (r: Rec) => Rec) => void;
  reset: () => void;
}

function hueFor(pods: string[], id: string, community: string | null): Hue {
  if (id === community) return "grove";
  const i = pods.filter((p) => p !== community).indexOf(id);
  return i === 1 ? "signal" : i === 2 ? "grove" : "ember";
}

export function initialRec(id: string, hue: Hue): Rec {
  return { id, hue, walks: 0, round: 1, stage: "new", plan: null, inn: [], votes: [], myVote: null, trace: [] };
}

const DEFAULT = [HOOPERS, "pod_rocket_city_strings"];

const blank = {
  name: "",
  interests: [] as string[],
  slots: [] as Slot[],
  community: null as string | null,
  promised: false,
  arrived: false,
  pods: [] as string[],
  recs: {} as Record<string, Rec>,
};

export const usePaths = create<S>()(
  persist(
    (set, get) => ({
      hydrated: false,
      ...blank,
      set: (p) => set(p),
      settle: () => {
        const s = get();
        const fromInterests = s.interests.map(podForInterest).filter((x): x is string => !!x);
        let pods = [...new Set(fromInterests.length ? fromInterests : DEFAULT)].slice(0, s.community ? 2 : 3);
        if (s.community) pods = [...pods, s.community];
        const recs: Record<string, Rec> = {};
        for (const id of pods) recs[id] = initialRec(id, hueFor(pods, id, s.community));
        set({ pods, recs, promised: true, arrived: false });
      },
      patch: (id, fn) =>
        set((s) => {
          const cur = s.recs[id] ?? initialRec(id, hueFor(s.pods, id, s.community));
          return { recs: { ...s.recs, [id]: fn(cur) } };
        }),
      reset: () => set({ ...blank }),
    }),
    {
      name: "pods:paths:v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        name: s.name, interests: s.interests, slots: s.slots, community: s.community, promised: s.promised, arrived: s.arrived, pods: s.pods, recs: s.recs,
      }),
      onRehydrateStorage: () => () => usePaths.setState({ hydrated: true }),
    },
  ),
);

/** Boot the concept store after mount (never during prerender). */
export function usePathsReady(): boolean {
  useEffect(() => {
    if (!usePaths.getState().hydrated) {
      try {
        void usePaths.persist.rehydrate();
      } catch {
        usePaths.setState({ hydrated: true });
      }
    }
  }, []);
  return usePaths((s) => s.hydrated);
}

export function useRec(id: string): Rec | null {
  return usePaths((s) => s.recs[id] ?? null);
}

/** Seeded members who say "I'm in" before you, for a given round. */
export function aheadOfYou(podId: string, round: number): string[] {
  const g = goingBefore(podId);
  const rest = members(podId).map((m) => m.id).filter((id) => !g.includes(id));
  const pool = [...g, ...rest];
  // Round 2: the same faces come back first, rotated so the order of arrival differs.
  const ordered = round === 1 ? pool : [...pool.slice(1), pool[0]];
  return ordered.slice(0, 3);
}
