// [U0] Pure read helpers over DbState. Use inside useDb(selector) or in repo modules.
// Add selectors here only if they're cross-unit; unit-specific ones live with the unit.
import type { DbState, Hangout, HangoutSuggestion, ID, Membership, Pod, PublicMember } from "@/lib/types";
import { toPublicMember } from "@/lib/utils";

export function myMemberships(db: DbState): Membership[] {
  return db.me ? db.memberships.filter((m) => m.user_id === db.me && m.left_at === null) : [];
}

export function myPods(db: DbState): Pod[] {
  return myMemberships(db)
    .map((m) => db.pods[m.pod_id])
    .filter(Boolean);
}

export function podMembers(db: DbState, podId: ID): Membership[] {
  return db.memberships.filter((m) => m.pod_id === podId && m.left_at === null);
}

export function membership(db: DbState, podId: ID, userId: ID | null = db.me): Membership | undefined {
  return userId ? db.memberships.find((m) => m.pod_id === podId && m.user_id === userId && m.left_at === null) : undefined;
}

/** Public member views for a pod (never identity, phone or DOB). `nowISO` from the clock. */
export function podPublicMembers(db: DbState, podId: ID, nowISO: string): PublicMember[] {
  return podMembers(db, podId)
    .map((m) => db.users[m.user_id])
    .filter(Boolean)
    .map((u) => toPublicMember(u, nowISO));
}

/** The pod's current plan: newest-round suggestion that is accepted / suggested / pending_review. */
export function activeSuggestion(db: DbState, podId: ID): HangoutSuggestion | undefined {
  const list = Object.values(db.suggestions).filter(
    (s) => s.pod_id === podId && s.status !== "replaced",
  );
  list.sort((a, b) => b.round - a.round || a.option_index - b.option_index);
  const top = list[0];
  if (!top) return undefined;
  return list.find((s) => s.round === top.round && s.status === "accepted") ?? top;
}

export function hangoutForSuggestion(db: DbState, suggestionId: ID): Hangout | undefined {
  return Object.values(db.hangouts).find((h) => h.suggestion_id === suggestionId);
}

/** RSVP target id: the hangout id once locked, else the suggestion id. */
export function rsvpTargetId(db: DbState, s: HangoutSuggestion): ID {
  return hangoutForSuggestion(db, s.id)?.id ?? s.id;
}

export function goingUserIds(db: DbState, targetId: ID): ID[] {
  return db.rsvps.filter((r) => r.hangout_id === targetId && r.status === "going").map((r) => r.user_id);
}

export function myRsvp(db: DbState, targetId: ID) {
  return db.me ? db.rsvps.find((r) => r.hangout_id === targetId && r.user_id === db.me) : undefined;
}
