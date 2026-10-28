// [U3] Rematch after leaving a pod (ARCHITECTURE §9.2) and the waitlist sweep (§9.1 step 6 background check).
// leavePod sets left_at first, then calls rematch(). Nobody is told who left; only the member count changes.
import type { PlacementConfig } from "@/config/placement";
import type { DbState, ID, ISODateTime, PlacementResult } from "@/lib/types";
import {
  candidatesFor,
  communityCandidate,
  placeDetailed,
  type Candidate,
  type NewPodPlan,
  type PlaceOptions,
} from "./engine";
import { DEFAULT_TAXONOMY, type Taxonomy } from "./taxonomy";

export interface RematchOutcome {
  result: PlacementResult;
  newPod?: NewPodPlan;
  /** Matches Repo.leavePod's return shape. */
  rematchedInto: ID | null;
  waitlisted: boolean;
}

/** Re-run placement for the single candidate the left pod represented, excluding that pod. */
export function rematch(
  db: DbState,
  userId: ID,
  leftPodId: ID,
  config: PlacementConfig,
  opts: Omit<PlaceOptions, "only" | "excludePodIds"> = {},
): RematchOutcome | null {
  const user = db.users[userId];
  const pod = db.pods[leftPodId];
  if (!user || !pod) return null;
  const tax: Taxonomy = opts.taxonomy ?? DEFAULT_TAXONOMY;
  let candidate: Candidate | undefined;
  if (pod.type === "interest") {
    candidate = candidatesFor(null, [pod.topic_key], db, config, tax)[0];
  } else {
    const ident = db.identities[userId];
    const own = pod.community_kind === "heritage" ? ident?.heritage : ident?.faith;
    // If the person deleted the field since, fall back to the pod's own group so the ladder still has a rung.
    candidate = communityCandidate(pod.community_kind ?? "heritage", own?.code ?? pod.topic_key, tax);
  }
  if (!candidate) return null;
  const interests = db.userInterests.filter((u) => u.user_id === userId).map((u) => u.interest_id);
  const out = placeDetailed(user, db.identities[userId], interests, db, config, {
    ...opts,
    only: [candidate],
    excludePodIds: [leftPodId],
  });
  if (!out.ok) return null;
  const result = out.results[0];
  return {
    result,
    newPod: out.newPods[0],
    rematchedInto: result.pod_id,
    waitlisted: result.outcome === "waitlisted",
  };
}

export interface WaitlistPlacement {
  user_id: ID;
  result: PlacementResult;
  newPod?: NewPodPlan;
}

/**
 * Re-check every waitlist entry (call after people join). Returns the entries that can now be placed;
 * the caller applies each with applyPlacementPlan. Entries that still cannot be placed are left alone.
 */
export function sweepWaitlist(
  db: DbState,
  config: PlacementConfig,
  opts: Omit<PlaceOptions, "only"> = {},
): WaitlistPlacement[] {
  const tax = opts.taxonomy ?? DEFAULT_TAXONOMY;
  const out: WaitlistPlacement[] = [];
  const claimed = new Set<ID>(); // a person can be pulled into a freshly planned pod only once
  for (const w of db.waitlist) {
    const user = db.users[w.user_id];
    if (!user || claimed.has(w.user_id + w.topic_key)) continue;
    let candidate: Candidate | undefined;
    if (w.pod_kind === "interest") candidate = candidatesFor(null, [w.topic_key], db, config, tax)[0];
    else {
      const ident = db.identities[w.user_id];
      const kind = ident?.heritage && tax.heritage[w.topic_key] ? "heritage" : "faith";
      candidate = communityCandidate(kind, w.topic_key, tax);
    }
    if (!candidate) continue;
    const res = placeDetailed(user, db.identities[w.user_id], [], db, config, { ...opts, only: [candidate] });
    if (!res.ok || res.results[0].outcome === "waitlisted") continue;
    claimed.add(w.user_id + w.topic_key);
    out.push({ user_id: w.user_id, result: res.results[0], newPod: res.newPods[0] });
  }
  return out;
}

export type { ISODateTime };
