// Lens concept journey state. One plane, so one store: the stage is a zoom level, not a page.
"use client";

import { create } from "zustand";
import type { Slot } from "@/lib/types";
import type { Plan, PlannerVenue, Forecast, Analysis, NextOption } from "@/lib/planner/types";
import type { TraceStep } from "@/lib/planner/client";

export type Stage =
  | "landing"
  | "name"
  | "loves"
  | "roots"
  | "week"
  | "faces"
  | "home"
  | "pod"
  | "plan"
  | "lock"
  | "again"
  | "vote"
  | "lock2";

export interface PlanOut {
  plan: Plan;
  venue: PlannerVenue;
  forecast: Forecast | null;
  analysis: Analysis;
  source: string;
  steps: TraceStep[];
}

interface LensState {
  stage: Stage;
  /** which pod the camera is inside (pod/plan stages) */
  focus: string | null;
  name: string;
  loves: string[];
  roots: string | null;
  week: Slot[];
  /** rounds locked so far for Hoops (0, 1, 2). Each one reprints the overlap a tint deeper. */
  rounds: number;
  plan: PlanOut | null;
  options: NextOption[] | null;
  chosen: number | null;
  againAnswer: "yes" | "not_yet" | null;
  go: (stage: Stage, focus?: string | null) => void;
  set: (patch: Partial<Omit<LensState, "go" | "set" | "toggleLove" | "toggleWeek">>) => void;
  toggleLove: (id: string) => void;
  toggleWeek: (s: Slot) => void;
}

export const useLens = create<LensState>((set) => ({
  stage: "landing",
  focus: null,
  name: "",
  loves: [],
  roots: null,
  week: [],
  rounds: 0,
  plan: null,
  options: null,
  chosen: null,
  againAnswer: null,
  go: (stage, focus) => set((s) => ({ stage, focus: focus === undefined ? s.focus : focus })),
  set: (patch) => set(patch),
  toggleLove: (id) => set((s) => ({ loves: s.loves.includes(id) ? s.loves.filter((x) => x !== id) : [...s.loves, id] })),
  toggleWeek: (slot) => set((s) => ({ week: s.week.includes(slot) ? s.week.filter((x) => x !== slot) : [...s.week, slot] })),
}));
