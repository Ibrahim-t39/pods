// Continuous placement (founder 2026-10-28: "as they add interests after, we continue finding new pods for them").
// Likes and communities are never final. After sign-up, any like or community you add is placed with the same engine
// and the same rules (pod size 6-10, age band, widening ladder, blocks either way, verified only), but nothing is
// joined until you say so: placement here only proposes. A proposal is a PodMatch ("New pod for you", Join / Not now).
// Pure: no clock, no storage, no writes. The repo turns matches into rows, notifications and memberships.
import type { DbState, ID, ISODateTime, PodMatch, PlacementResult } from "@/lib/types";
import { candidatesFor, communityCandidate, placeDetailed, type Candidate, type NewPodPlan, type PlacementPlan } from "./engine";
import { activeMemberIds } from "./scoring";
import { DEFAULT_TAXONOMY, type Taxonomy } from "./taxonomy";

export type MatchKind = PodMatch["kind"];

export interface MatchProposal {
  kind: MatchKind;
  topic_key: string;
  label: string;
  pod_id: ID;
  pod_name: string;
  size: number;
  note: string | null;
  /** The pod placement would start (absent when an existing pod has room). */
  newPod?: NewPodPlan;
}

export interface MatchScan {
  proposals: MatchProposal[];
  /** Likes and communities with no pod yet (too few people nearby). Placement keeps looking; nothing is shown. */
  waiting: { kind: MatchKind; topic_key: string; label: string }[];
}

export interface MatchOptions {
  now?: ISODateTime;
  taxonomy?: Taxonomy;
}

const kindOf = (c: Candidate): MatchKind => (c.type === "interest" ? "interest" : (c.community_kind ?? "heritage"));

/** Live memberships of a person (not left), with their pods. */
function livePods(db: DbState, userId: ID) {
  return db.memberships
    .filter((m) => m.user_id === userId && !m.left_at)
    .map((m) => db.pods[m.pod_id])
    .filter((p): p is NonNullable<typeof p> => !!p && p.status !== "closed");
}

/** Is this like or community already covered by a pod you are in (active or on deck)? */
export function coveredBy(db: DbState, userId: ID, c: Candidate): ID | null {
  const keys = new Set(c.chain.map((n) => n.key));
  const hit = livePods(db, userId).find((p) =>
    c.type === "interest" ? p.type === "interest" && p.topic_key === c.topic_key : p.type === "community" && p.community_kind === c.community_kind && keys.has(p.topic_key),
  );
  return hit?.id ?? null;
}

/** The candidate a match stands for, rebuilt from the person's current likes and communities. Null when it is gone. */
export function candidateForMatch(db: DbState, userId: ID, m: Pick<PodMatch, "kind" | "topic_key">, tax: Taxonomy = DEFAULT_TAXONOMY): Candidate | null {
  if (m.kind === "interest") {
    if (!db.userInterests.some((u) => u.user_id === userId && u.interest_id === m.topic_key)) return null;
    return candidatesFor(null, [m.topic_key], db, db.config.placement, tax)[0] ?? null;
  }
  const v = m.kind === "heritage" ? db.identities[userId]?.heritage : db.identities[userId]?.faith;
  if (!v) return null;
  return communityCandidate(m.kind, v.code, tax);
}

/** Every like and community the person holds that no pod covers yet, narrowest first, likes before communities. */
export function uncoveredCandidates(db: DbState, userId: ID, tax: Taxonomy = DEFAULT_TAXONOMY): Candidate[] {
  const interests = db.userInterests.filter((u) => u.user_id === userId).map((u) => u.interest_id);
  const cfg = { ...db.config.placement, maxInterestPods: Number.MAX_SAFE_INTEGER, maxCommunityPods: 2 };
  return candidatesFor(db.identities[userId], interests, db, cfg, tax).filter((c) => !coveredBy(db, userId, c));
}

function proposalFrom(db: DbState, userId: ID, c: Candidate, r: PlacementResult, newPods: NewPodPlan[]): MatchProposal | null {
  if (!r.pod_id || r.outcome === "waitlisted") return null;
  const planned = newPods.find((n) => n.pod.id === r.pod_id);
  const pod = db.pods[r.pod_id] ?? planned?.pod;
  if (!pod) return null;
  const others = planned ? planned.member_ids.length : activeMemberIds(db, r.pod_id).filter((id) => id !== userId).length;
  return {
    kind: kindOf(c),
    topic_key: c.topic_key,
    label: c.label,
    pod_id: pod.id,
    pod_name: pod.name,
    size: others + 1,
    note: r.steps.some((s) => s.rule === "widen_group") && pod.widened_from ? `Widened to ${pod.widened_from.to}.` : null,
    newPod: planned,
  };
}

/**
 * Scan for new pods. Skips anything already covered, already proposed (status "new") or set aside ("skipped"), and
 * respects the interest-pod cap (pods you are in + open proposals). One proposal per like or community.
 */
export function findPodMatches(db: DbState, userId: ID, opts: MatchOptions = {}): MatchScan {
  const user = db.users[userId];
  const out: MatchScan = { proposals: [], waiting: [] };
  if (!user) return out;
  const tax = opts.taxonomy ?? DEFAULT_TAXONOMY;
  const cfg = db.config.placement;
  const held = (db.podMatches ?? []).filter((m) => m.user_id === userId && (m.status === "new" || m.status === "skipped"));
  const isHeld = (c: Candidate) => held.some((m) => m.kind === kindOf(c) && m.topic_key === c.topic_key);
  let interestRoom =
    cfg.maxInterestPods -
    livePods(db, userId).filter((p) => p.type === "interest").length -
    held.filter((m) => m.kind === "interest" && m.status === "new").length;

  let scratch = db;
  for (const c of uncoveredCandidates(db, userId, tax)) {
    if (isHeld(c)) continue;
    if (c.type === "interest" && interestRoom <= 0) continue;
    const res = placeDetailed(user, db.identities[userId], [], scratch, cfg, { now: opts.now, taxonomy: tax, only: [c] });
    if (!res.ok) return out; // not eligible (unverified, out of metro, age): no matches at all
    const p = proposalFrom(scratch, userId, c, res.results[0], res.newPods);
    if (!p) {
      out.waiting.push({ kind: kindOf(c), topic_key: c.topic_key, label: c.label });
      continue;
    }
    // a pod planned for an earlier proposal in this same scan must not be planned twice
    if (p.newPod) scratch = { ...scratch, pods: { ...scratch.pods, [p.newPod.pod.id]: p.newPod.pod } };
    if (c.type === "interest") interestRoom--;
    out.proposals.push(p);
  }
  return out;
}

/** A proposal as a stored row. */
export function toMatch(p: MatchProposal, id: ID, userId: ID, now: ISODateTime): PodMatch {
  return {
    id,
    user_id: userId,
    kind: p.kind,
    topic_key: p.topic_key,
    label: p.label,
    pod_id: p.pod_id,
    pod_name: p.pod_name,
    size: p.size,
    note: p.note,
    status: "new",
    created_at: now,
    decided_at: null,
  };
}

/**
 * The plan for saying yes to a match, re-checked now (the pod may have filled or someone may have blocked you since).
 * Null when the like is gone or nothing can be joined right now. Apply with applyPlacementPlan.
 */
export function planForMatch(db: DbState, userId: ID, m: PodMatch, opts: MatchOptions = {}): PlacementPlan | null {
  const user = db.users[userId];
  if (!user) return null;
  const tax = opts.taxonomy ?? DEFAULT_TAXONOMY;
  const c = candidateForMatch(db, userId, m, tax);
  if (!c || coveredBy(db, userId, c)) return null;
  const res = placeDetailed(user, db.identities[userId], [], db, db.config.placement, { now: opts.now, taxonomy: tax, only: [c] });
  if (!res.ok) return null;
  const r = res.results[0];
  if (!r.pod_id || r.outcome === "waitlisted") return null;
  // Saying yes opens the pod now (the pods-at-start rule is for the first placement only).
  return { results: [{ ...r, outcome: r.outcome === "deferred" ? "joined_existing" : r.outcome }], newPods: res.newPods };
}

/** Open proposals for a person, newest first. */
export function openMatches(db: Pick<DbState, "podMatches">, userId: ID | null): PodMatch[] {
  if (!userId) return [];
  return (db.podMatches ?? []).filter((m) => m.user_id === userId && m.status === "new").sort((a, b) => b.created_at.localeCompare(a.created_at));
}
