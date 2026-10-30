// First-run draft (V3_SPEC §6.2). The answers given BEFORE a number exists (You, Likes, Free, Community) live only
// in this browser ("pods:onboarding:v2") so every step survives a refresh. They are committed through the Repo the
// moment the code is accepted (commitDraft), and then cleared. Nothing is stored server-side before the number.
"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import type { Rhythm, Slot } from "@/lib/types";
import { useStore } from "@/lib/db/store";
import { clearMinorBlocks } from "@/lib/db/local/auth";

export const DRAFT_KEY = "pods:onboarding:v2";

export interface Draft {
  firstName: string;
  age: number | null;
  interests: string[];
  free: Slot[];
  /** "Same most weeks" (default) or "Changes week to week". */
  rhythm?: Rhythm;
  /** Community pods (opt-in, B03s): one region and/or one denomination code. Never inferred. */
  heritage: string | null;
  faith: string | null;
  /** City picked in the one picker ("Not here?"); null = the number's region (the first metro city). */
  city: string | null;
  /** "Let AI plan from free times." (B07, Apple 5.1.2(i)). Explicit, on by default. */
  claudeOk: boolean;
  /** Under-18 hard stop for this browser (B01e). */
  minorBlocked: boolean;
}

const EMPTY: Draft = { firstName: "", age: null, interests: [], free: [], heritage: null, faith: null, city: null, claudeOk: true, minorBlocked: false };

interface DraftStore extends Draft {
  set: (patch: Partial<Draft>) => void;
  clear: () => void;
}

const memory = new Map<string, string>();
const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return memory.get(k) ?? null;
    }
  },
  setItem: (k, v) => {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      memory.set(k, v);
    }
  },
  removeItem: (k) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      memory.delete(k);
    }
  },
};

export const useDraft = create<DraftStore>()(
  persist(
    (set) => ({
      ...EMPTY,
      set: (patch) => set(patch),
      clear: () => set({ ...EMPTY }),
    }),
    {
      name: DRAFT_KEY,
      storage: createJSONStorage(() => safeStorage),
      skipHydration: true,
      partialize: ({ set: _s, clear: _c, ...rest }) => rest,
    },
  ),
);

const useDraftReady = create<{ ready: boolean }>(() => ({ ready: false }));

/** Read the persisted draft after mount (never during prerender). Returns true once ready. */
export function useDraftHydrated(): boolean {
  const ready = useDraftReady((s) => s.ready);
  useEffect(() => {
    if (useDraftReady.getState().ready) return;
    Promise.resolve(useDraft.persist.rehydrate()).finally(() => useDraftReady.setState({ ready: true }));
  }, []);
  return ready;
}

/** Clear everything first run keeps outside the db (draft + minor blocks). Called on Start over. */
export function clearOnboardingLocal() {
  useDraft.getState().clear();
  clearMinorBlocks();
}

/** A db swap that does not raise `rev` and drops `me` is a Start over (fresh seed): clear the draft too. */
export function useResetWatcher(onReset?: () => void) {
  useEffect(() => {
    let prev = useStore.getState();
    return useStore.subscribe((s) => {
      const was = prev;
      prev = s;
      if (!was.hydrated || !s.hydrated || s.db === was.db) return;
      if (s.db.rev <= was.db.rev && was.db.me && !s.db.me) {
        clearOnboardingLocal();
        onReset?.();
      }
    });
  }, [onReset]);
}

/**
 * A birth date that keeps `age` true for the next six months: `age` years and six months before today's date.
 * Pods asks the age, not the birthday (B01); the ID check confirms it. The old "day after today, age + 1 years ago"
 * turned 22 into 23 the moment the demo clock moved a day forward (the Director's jump), so the profile disagreed
 * with what was typed. Reads the calendar date straight off the ISO string (the clock is Chicago local time), so no
 * UTC shift can move it by a day either.
 */
export function dobForAge(age: number, nowISO: string): string {
  const [y, m, d] = nowISO.slice(0, 10).split("-").map(Number);
  let month = m - 6;
  let year = y - age;
  if (month < 1) {
    month += 12;
    year -= 1;
  }
  const day = Math.min(d, 28);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
