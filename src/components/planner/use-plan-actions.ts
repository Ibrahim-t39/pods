// [U4] Card/details actions with optimistic updates + Undo (BLUEPRINT §2.10), and the planner runs that create new
// options (Suggest something else, next-round options, "Plan something"). Guarded so two mounted cards (chat + details
// panel) or two tabs never plan the same round twice.
"use client";

import { useCallback, useState } from "react";
import { create } from "zustand";
import { toast } from "sonner";
import { haptic } from "@/components/brand";
import { useDb, useRepo } from "@/lib/db/hooks";
import { useStore } from "@/lib/db/store";
import { nowISO } from "@/lib/time/clock";
import { buildPlannerInput, optionToSuggestion, planToSuggestion } from "@/lib/planner/adapt";
import { usePlanner, type TraceStep } from "@/lib/planner/client";
import type { AvoidPref } from "@/lib/planner/types";
import type { HangoutSuggestion, ID, PlannerStep } from "@/lib/types";
import type { CardView } from "@/lib/planner/card-state";

const inflight = new Set<string>();

type GenKind = "suggest" | "next" | "plan";
/** Live planner runs per pod, shared by every mounted card / details view (client-only UI state, not persisted). */
const useGen = create<{ byPod: Record<string, { kind: GenKind; steps: TraceStep[] } | undefined> }>(() => ({ byPod: {} }));
const setGen = (podId: string, v: { kind: GenKind; steps: TraceStep[] } | undefined) => useGen.setState((s) => ({ byPod: { ...s.byPod, [podId]: v } }));
const startGen = (podId: string, k: GenKind | null) => setGen(podId, k ? { kind: k, steps: [] } : undefined);
const mirror = (podId: string) => (steps: TraceStep[]) => {
  const cur = useGen.getState().byPod[podId];
  if (cur) setGen(podId, { ...cur, steps });
};

const toStored = (steps: { id: PlannerStep["id"]; label: string; detail?: string; status: string }[]): PlannerStep[] =>
  steps.map((s) => ({ id: s.id, label: s.label, detail: s.detail, status: s.status === "warn" ? "warn" : "done" }));

export function usePlanActions(podId: ID) {
  const repo = useRepo();
  const podName = useDb((db) => {
    const p = db.pods[podId];
    if (!p) return "";
    return p.type === "community" && db.config.flags.maskCommunityInApp ? "Community pod" : p.name;
  });
  const [optimistic, setOptimistic] = useState<null | "going" | "not_going">(null);
  const [busy, setBusy] = useState(false);
  const planner = usePlanner();
  const gen = useGen((s) => s.byPod[podId]);

  const rsvp = useCallback(
    async (targetId: ID, status: "going" | "not_going", opts: { when?: string; silent?: boolean } = {}) => {
      setOptimistic(status);
      setBusy(true);
      if (status === "going") haptic.light();
      const r = await repo.rsvp(targetId, status);
      setBusy(false);
      setOptimistic(null);
      if (!r.ok) {
        toast("Not sent.", { action: { label: "Retry", onClick: () => void repo.rsvp(targetId, status) } });
        return null;
      }
      if (!opts.silent) {
        const target = r.data.locked ? (Object.values(useStore.getState().db.hangouts).find((h) => h.suggestion_id === targetId)?.id ?? targetId) : targetId;
        toast(status === "going" ? "You're in." : "Seat given back.", {
          duration: 6000,
          action: { label: "Undo", onClick: () => void repo.rsvp(target, status === "going" ? "not_going" : "going") },
        });
      }
      return r.data;
    },
    [repo],
  );

  const dismiss = useCallback(async () => {
    await repo.dismissCard(podId);
    toast("Hidden for you.", {
      duration: 8000,
      action: { label: "Undo", onClick: () => void repo.undismissCard(podId) },
    });
  }, [repo, podId]);

  /** "Suggest something else": runs the planner in the card slot; the result becomes the next option. */
  const suggestElse = useCallback(
    async (current: HangoutSuggestion, prefs: AvoidPref[]) => {
      const db = useStore.getState().db;
      const round = current.round;
      const taken = Object.values(db.suggestions).filter((s) => s.pod_id === podId && s.round === round && s.status !== "replaced").map((s) => s.option_index);
      const next = ([0, 1, 2] as const).find((i) => !taken.includes(i));
      if (next === undefined || next >= db.config.planner.maxOptions) {
        toast("Three is the most. Pick one.");
        return;
      }
      const key = `${podId}:${round}:${next}`;
      if (inflight.has(key)) return;
      inflight.add(key);
      startGen(podId, "suggest");
      try {
        const input = buildPlannerInput(db, podId, { nowISO: nowISO(), avoid: { suggestion: current, prefs } });
        input.hangoutNumber = round === 1 ? 1 : input.hangoutNumber;
        const res = await planner.run("plan", input, { podLabel: podName, dwellMs: db.config.planner.stepDwellMs, onSteps: mirror(podId) });
        if (res.plan) {
          const s = planToSuggestion(podId, res.plan.plan, res.plan.source, toStored(res.steps), round, next);
          const r = await repo.saveSuggestion(s);
          if (!r.ok) toast(r.error.code === "CONFLICT" ? "Three is the most. Pick one." : "Not saved. Try again.");
        } else if (res.status === "no_venue") toast("No other place fits yet.");
      } finally {
        inflight.delete(key);
        startGen(podId, null);
      }
    },
    [planner, podId, podName, repo],
  );

  /** After the run-it-back reveal: draft 2-3 options for the next round and open the vote (BLUEPRINT §7.1). */
  const planNextRound = useCallback(
    async (view: CardView) => {
      const h = view.lastHangout;
      if (!h) return;
      const db = useStore.getState().db;
      const round = h.sequence + 1;
      const key = `${podId}:${round}:next`;
      if (inflight.has(key)) return;
      if (Object.values(db.suggestions).some((s) => s.pod_id === podId && s.round === round)) return;
      inflight.add(key);
      startGen(podId, "next");
      try {
        const input = buildPlannerInput(db, podId, { nowISO: nowISO(), afterHangoutId: h.id });
        const res = await planner.run("next_options", input, { podLabel: podName, dwellMs: db.config.planner.stepDwellMs, onSteps: mirror(podId) });
        const trace = toStored(res.steps);
        if (res.options) {
          const fresh = useStore.getState().db;
          if (Object.values(fresh.suggestions).some((s) => s.pod_id === podId && s.round === round)) return;
          for (const [i, o] of res.options.options.slice(0, fresh.config.planner.maxOptions).entries()) {
            await repo.saveSuggestion(optionToSuggestion(podId, o, trace, round, i as 0 | 1 | 2));
          }
        }
      } finally {
        inflight.delete(key);
        startGen(podId, null);
      }
    },
    [planner, podId, podName, repo],
  );

  /** "Your pods are quiet" → plan something now. */
  const planNow = useCallback(async () => {
    const db = useStore.getState().db;
    const round = Object.values(db.hangouts).filter((h) => h.pod_id === podId && h.status !== "cancelled").length + 1;
    const key = `${podId}:${round}:plan`;
    if (inflight.has(key)) return;
    inflight.add(key);
    startGen(podId, "plan");
    try {
      const input = buildPlannerInput(db, podId, { nowISO: nowISO() });
      const res = await planner.run("plan", input, { podLabel: podName, dwellMs: db.config.planner.stepDwellMs, onSteps: mirror(podId) });
      if (res.plan) await repo.saveSuggestion(planToSuggestion(podId, res.plan.plan, res.plan.source, toStored(res.steps), round, 0));
    } finally {
      inflight.delete(key);
      startGen(podId, null);
    }
  }, [planner, podId, podName, repo]);

  return { rsvp, dismiss, suggestElse, planNextRound, planNow, optimistic, busy, planner, genKind: gen?.kind ?? null, genSteps: gen?.steps ?? [], podName };
}
