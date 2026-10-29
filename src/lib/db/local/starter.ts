// Platform §F3: "Every pod opens with its first hangout already planned." After placement, an added interest, a
// Discover join or an invite, any pod you are in without a plan gets one from the on-device planner pipeline (the same
// steps the UI shows; no network, so it is instant and works offline). "Ask AI for a new plan" in the pod still runs the
// server planner through /api/plan. Pure over the db snapshot; the commit is done by the caller-facing helper below.
import type { Draft } from "immer";
import type { DbState, HangoutSuggestion, ID, PlannerStep } from "@/lib/types";
import { buildPlannerInput, planToSuggestion } from "@/lib/planner/adapt";
import { runPlanner } from "@/lib/planner/run";
import { newId } from "@/lib/ids";
import type { RepoCtx } from "./context";
import { ensureLock, hostMessage } from "./hangouts";

/** Pods (of `userId`) that are active, open to them, and have no live plan and no upcoming hangout. */
export function podsNeedingStarter(db: DbState, userId: ID): ID[] {
  return db.memberships
    .filter((m) => m.user_id === userId && !m.left_at && m.activation === "active")
    .map((m) => m.pod_id)
    .filter((podId) => {
      const pod = db.pods[podId];
      if (!pod || pod.status === "closed") return false;
      if (Object.values(db.suggestions).some((s) => s.pod_id === podId && s.status !== "replaced")) return false;
      return !Object.values(db.hangouts).some((h) => h.pod_id === podId && (h.status === "upcoming" || h.status === "in_progress"));
    });
}

/** Run the planner for one pod. Null when no venue fits (the pod then shows "choosing a spot"). */
export async function draftStarter(db: DbState, podId: ID, nowISO: string): Promise<Omit<HangoutSuggestion, "id" | "created_at"> | null> {
  const input = buildPlannerInput(db, podId, { nowISO });
  const steps: PlannerStep[] = [];
  for await (const e of runPlanner(input, { mode: "local" }, "plan")) {
    if (e.type === "step") {
      const i = steps.findIndex((s) => s.id === e.id);
      const row: PlannerStep = { id: e.id, label: e.label, detail: e.detail, status: e.status === "warn" ? "warn" : "done" };
      if (i >= 0) steps[i] = row;
      else steps.push(row);
    }
    if (e.type === "error") return null;
    if (e.type === "plan") return planToSuggestion(podId, e.plan, e.source, steps, 1, 0);
  }
  return null;
}

/** Write a starter suggestion onto a draft (same side effects as repo.saveSuggestion for option 0). */
export function applyStarter(d: Draft<DbState>, s: Omit<HangoutSuggestion, "id" | "created_at">, now: string): ID {
  const id = newId("sug");
  d.suggestions[id] = { ...s, id, created_at: now } as HangoutSuggestion;
  ensureLock(d, d.suggestions[id]);
  if (d.config.planner.adminReview) d.suggestions[id].status = "pending_review";
  hostMessage(d, s.pod_id, s.summary, now, "plan_card", id);
  return id;
}

/** Plan every pod of the signed-in person that needs a starter. Returns the new suggestion ids. Never throws. */
export async function ensureStarterPlans(ctx: RepoCtx, only?: ID[]): Promise<ID[]> {
  const me = ctx.meId();
  if (!me) return [];
  const made: ID[] = [];
  for (const podId of podsNeedingStarter(ctx.get(), me)) {
    if (only && !only.includes(podId)) continue;
    try {
      const s = await draftStarter(ctx.get(), podId, ctx.now());
      if (!s) continue;
      // Re-check inside the commit: another tab may have planned it meanwhile.
      if (!podsNeedingStarter(ctx.get(), me).includes(podId)) continue;
      ctx.commit((d) => {
        made.push(applyStarter(d, s, ctx.now()));
      });
    } catch {
      /* the pod shows its planning state; the UI can retry with "Ask AI for a plan" */
    }
  }
  return made;
}
