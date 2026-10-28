// [U3] previewPlacement: the D14 dry run. Pure. Returns a PlacementRun with dry_run:true; nothing is written, nobody is
// added to any pod, and no names, chats or member lists are involved. Cards carry pod types and member counts only.
import type { PlacementConfig } from "@/config/placement";
import { hash32 } from "@/lib/ids";
import type { DbState, ID, PlacementRun, Pod } from "@/lib/types";
import { makeRun, placeDetailed, type NewPodPlan, type PlaceOptions, type PlacementErrorCode } from "./engine";
import { activeMemberIds } from "./scoring";

export type PreviewOutcome = { ok: true; run: PlacementRun; newPods: NewPodPlan[] } | { ok: false; code: PlacementErrorCode };

export function previewPlacement(
  db: DbState,
  userId: ID,
  config: PlacementConfig = db.config.placement,
  opts: Omit<PlaceOptions, "dryRun"> = {},
): PreviewOutcome {
  const user = db.users[userId];
  if (!user) return { ok: false, code: "NOT_ACTIVE" };
  const interests = db.userInterests.filter((u) => u.user_id === userId).map((u) => u.interest_id);
  const out = placeDetailed(user, db.identities[userId], interests, db, config, { ...opts, dryRun: true });
  if (!out.ok) return out;
  const now = opts.now ?? db.clock.virtual_at;
  // Deterministic id so a re-render of the same preview is identical.
  const id = `prun_preview_${hash32(`${userId}|${now}`).toString(36)}`;
  return { ok: true, run: makeRun(id, userId, now, out.results, true), newPods: out.newPods };
}

export interface PreviewCard {
  type: Pod["type"];
  community_kind: Pod["community_kind"];
  label: string;
  /** Members including you. Count only. */
  member_count: number;
  outcome: PlacementRun["results"][number]["outcome"];
  widened: boolean;
  /** "Opens after your first check-in" for deferred pods. */
  note: string | null;
}

/** The locked "N pods are ready for you" cards (OB-11b): types and counts, never members. */
export function previewCards(run: PlacementRun, db: DbState, newPods: NewPodPlan[] = []): PreviewCard[] {
  return run.results.map((r) => {
    let count = 0;
    if (r.pod_id) {
      const planned = newPods.find((n) => n.pod.id === r.pod_id);
      const members = planned ? planned.member_ids.length : activeMemberIds(db, r.pod_id).filter((m) => m !== run.user_id).length;
      count = members + 1;
    }
    const pod = r.pod_id ? (db.pods[r.pod_id] ?? newPods.find((n) => n.pod.id === r.pod_id)?.pod) : undefined;
    return {
      type: r.candidate.type,
      community_kind: r.candidate.community_kind,
      label: pod?.topic ?? r.candidate.label,
      member_count: count,
      outcome: r.outcome,
      widened: r.steps.some((s) => s.rule === "widen_group") && r.outcome !== "waitlisted",
      note: r.outcome === "deferred" ? "Opens after your first check-in" : r.outcome === "waitlisted" ? r.user_note : null,
    };
  });
}
