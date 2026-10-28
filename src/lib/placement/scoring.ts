// [U3] Ranking and tie-breaks. No randomness anywhere (ARCHITECTURE §9.1 step 8). Never a numeric score shown to people.
import { hash32 } from "@/lib/ids";
import type { DbState, ID, Pod } from "@/lib/types";

/** Stable tie-break on (user_id, pod_id). */
export function tieBreak(userId: ID, key: string): number {
  return hash32(`${userId}|${key}`);
}

export function activeMemberIds(db: DbState, podId: ID): ID[] {
  const out: ID[] = [];
  for (const m of db.memberships) if (m.pod_id === podId && !m.left_at) out.push(m.user_id);
  return out;
}

/** A hangout or an open suggestion exists for the pod (spec: rank pods that have an upcoming hangout). */
export function hasUpcomingHangout(db: DbState, podId: ID): boolean {
  for (const h of Object.values(db.hangouts)) {
    if (h.pod_id === podId && (h.status === "upcoming" || h.status === "in_progress")) return true;
  }
  for (const s of Object.values(db.suggestions)) {
    if (s.pod_id === podId && s.status !== "replaced") return true;
  }
  return false;
}

export function ageMidpointDistance(pod: Pod, age: number): number {
  return Math.abs((pod.age_min + pod.age_max) / 2 - age);
}

export interface ExistingPodRankInput {
  pod: Pod;
  memberCount: number;
  alreadyMember: boolean;
  upcoming: boolean;
}

/** Order for "join existing": already a member, then upcoming hangout (if configured), open spots, age fit, stable hash. */
export function rankExisting(
  rows: ExistingPodRankInput[],
  opts: { userId: ID; age: number; podMax: number; preferUpcoming: boolean },
): ExistingPodRankInput[] {
  return [...rows].sort((a, b) => {
    if (a.alreadyMember !== b.alreadyMember) return a.alreadyMember ? -1 : 1;
    if (opts.preferUpcoming && a.upcoming !== b.upcoming) return a.upcoming ? -1 : 1;
    const spotsA = opts.podMax - a.memberCount;
    const spotsB = opts.podMax - b.memberCount;
    if (spotsA !== spotsB) return spotsB - spotsA;
    const dA = ageMidpointDistance(a.pod, opts.age);
    const dB = ageMidpointDistance(b.pod, opts.age);
    if (dA !== dB) return dA - dB;
    return tieBreak(opts.userId, a.pod.id) - tieBreak(opts.userId, b.pod.id);
  });
}

/**
 * Internal fit used only to decide which pods start active when podsAtStart = 2 (an existing pod with an upcoming
 * hangout first, then the least widened). Larger is better. Never shown to anyone.
 */
export function startFit(input: { upcoming: boolean; existing: boolean; widenRungs: number; ageDistance: number }): number {
  return (
    (input.upcoming ? 1000 : 0) + (input.existing ? 100 : 0) - input.widenRungs * 10 - Math.min(9, input.ageDistance)
  );
}
