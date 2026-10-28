// [U3] Placement engine (ARCHITECTURE §9.1). Pure: nothing here reads a clock, Math.random or storage, and nothing
// writes to the db. `placeDetailed` returns results plus the pods it would create; `applyPlacementPlan` is the one
// helper that turns a plan into writes on an immer draft (used by runPlacement, rematch and the waitlist sweep).
// Only this module and admin may read db.identities.
import type { PlacementConfig } from "@/config/placement";
import { seedId } from "@/lib/ids";
import { ageOn } from "@/lib/utils";
import type {
  DbState,
  ID,
  ISODateTime,
  Membership,
  PlacementResult,
  PlacementRun,
  PlacementStep,
  Pod,
  User,
  UserIdentity,
  WaitlistEntry,
} from "@/lib/types";
import { ageRangeLabel, bandFor, buildLadder, groupChain, inGroup } from "./ladder";
import { activeMemberIds, hasUpcomingHangout, rankExisting, startFit, tieBreak } from "./scoring";
import { DEFAULT_TAXONOMY, type TaxKind, type Taxonomy } from "./taxonomy";

export type PlacementErrorCode = "NOT_ACTIVE" | "NOT_VERIFIED" | "OUT_OF_METRO" | "UNDERAGE" | "OVER_AGE";

export interface NewPodPlan {
  pod: Pod;
  /** Existing members chosen for the new pod (the placed user is added by applyPlacementPlan). */
  member_ids: ID[];
}

export interface PlacementPlan {
  results: PlacementResult[];
  newPods: NewPodPlan[];
}

export type PlacementOutcome = ({ ok: true } & PlacementPlan) | { ok: false; code: PlacementErrorCode };

export interface PlaceOptions {
  /** ISO "now" used for ages. Defaults to db.clock.virtual_at. */
  now?: ISODateTime;
  taxonomy?: Taxonomy;
  /** Pods that must not be joined (rematch passes the pod just left). */
  excludePodIds?: ID[];
  /** Dry run (previewPlacement): the verification gate is skipped because nothing is written. */
  dryRun?: boolean;
  /** Override db.config.flags.podsAtStart. */
  podsAtStart?: "all" | 2;
  /** Place only these candidates (rematch / waitlist sweep). Skips the pods-at-start step. */
  only?: Candidate[];
}

export interface Candidate {
  type: Pod["type"];
  community_kind: Pod["community_kind"];
  /** The user's own (narrowest) key: interest id, or lowercase taxonomy code. */
  topic_key: string;
  label: string;
  /** Narrowest first. Interests have exactly one entry. */
  chain: { key: string; label: string; plural: string; place: string }[];
}

export function checkEligibility(
  user: User,
  cfg: PlacementConfig,
  opts: { now: ISODateTime; dryRun?: boolean },
): PlacementErrorCode | null {
  if (user.status === "suspended" || user.status === "banned" || user.status === "deleted") return "NOT_ACTIVE";
  if (!cfg.metro.includes(user.city)) return "OUT_OF_METRO";
  const age = ageOn(user.date_of_birth, opts.now);
  if (age < cfg.minAge) return "UNDERAGE";
  if (age > cfg.maxAge) return "OVER_AGE";
  if (!opts.dryRun && (!user.verified || user.status !== "active")) return "NOT_VERIFIED";
  return null;
}

export function candidatesFor(
  identity: UserIdentity | null | undefined,
  interestIds: ID[],
  db: Pick<DbState, "interests">,
  cfg: PlacementConfig,
  tax: Taxonomy,
): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  for (const id of interestIds) {
    const it = db.interests[id];
    if (!it || !it.active || seen.has(id)) continue;
    seen.add(id);
    if (seen.size > cfg.maxInterestPods) break;
    out.push({
      type: "interest",
      community_kind: null,
      topic_key: id,
      label: it.label,
      chain: [{ key: id, label: it.label, plural: it.label, place: it.label }],
    });
  }
  const communities: Candidate[] = [];
  if (identity?.heritage) communities.push(communityCandidate("heritage", identity.heritage.code, tax));
  if (identity?.faith) communities.push(communityCandidate("faith", identity.faith.code, tax));
  return out.concat(communities.slice(0, cfg.maxCommunityPods));
}

export function communityCandidate(kind: TaxKind, code: string, tax: Taxonomy): Candidate {
  const chain = groupChain(kind, code, tax);
  return {
    type: "community",
    community_kind: kind,
    topic_key: chain[0].key,
    label: chain[0].label,
    chain: chain.map((n) => ({ key: n.key, label: n.label, plural: n.plural, place: n.place })),
  };
}

// ── internals ──────────────────────────────────────────────────────────

interface Ctx {
  db: DbState;
  user: User;
  age: number;
  cfg: PlacementConfig;
  tax: Taxonomy;
  now: ISODateTime;
  excluded: Set<ID>;
  blockedWith: Set<ID>;
  /** Eligible other people: active, verified, in the metro, not blocked either way. */
  others: { user: User; age: number }[];
  /** user_id -> interest ids */
  interestsOf: Map<ID, Set<ID>>;
  metroCount: number;
  blockedCount: number;
}

function buildCtx(db: DbState, user: User, cfg: PlacementConfig, tax: Taxonomy, now: ISODateTime, extraExcluded: ID[]): Ctx {
  const blockedWith = new Set<ID>();
  for (const b of db.blocks) {
    if (b.blocker_id === user.id) blockedWith.add(b.blocked_id);
    else if (b.blocked_id === user.id) blockedWith.add(b.blocker_id);
  }
  const excluded = new Set<ID>(extraExcluded);
  for (const m of db.memberships) if (m.user_id === user.id && m.left_at) excluded.add(m.pod_id);
  const interestsOf = new Map<ID, Set<ID>>();
  for (const ui of db.userInterests) {
    let s = interestsOf.get(ui.user_id);
    if (!s) interestsOf.set(ui.user_id, (s = new Set()));
    s.add(ui.interest_id);
  }
  const others: Ctx["others"] = [];
  let metroCount = 0;
  let blockedCount = 0;
  for (const u of Object.values(db.users)) {
    if (u.id === user.id || u.status !== "active" || !u.verified || !cfg.metro.includes(u.city)) continue;
    metroCount++;
    if (blockedWith.has(u.id)) {
      blockedCount++;
      continue;
    }
    others.push({ user: u, age: ageOn(u.date_of_birth, now) });
  }
  return {
    db,
    user,
    age: ageOn(user.date_of_birth, now),
    cfg,
    tax,
    now,
    excluded,
    blockedWith,
    others,
    interestsOf,
    metroCount,
    blockedCount,
  };
}

/**
 * True when the person is already in a live pod that covers this group. For communities any pod of the same kind
 * whose key is on the candidate's chain counts (so a widened pod is never raided to start a wider one).
 */
function inTopicPod(ctx: Ctx, c: Candidate, key: string, userId: ID): boolean {
  const keys = c.type === "interest" ? [key] : c.chain.map((g) => g.key);
  for (const m of ctx.db.memberships) {
    if (m.user_id !== userId || m.left_at) continue;
    const p = ctx.db.pods[m.pod_id];
    if (p && p.status !== "closed" && p.type === c.type && p.community_kind === c.community_kind && keys.includes(p.topic_key))
      return true;
  }
  return false;
}

/**
 * Eligible, age-matched people who share group `key`; by default only those not yet in a covering pod.
 * `includePlaced` gives the honest "how many nearby" count used in copy.
 */
function poolFor(ctx: Ctx, c: Candidate, key: string, band: number, includePlaced = false) {
  const out: { user: User; age: number }[] = [];
  for (const o of ctx.others) {
    if (Math.abs(o.age - ctx.age) > band) continue;
    if (c.type === "interest") {
      if (!ctx.interestsOf.get(o.user.id)?.has(key)) continue;
    } else {
      const id = ctx.db.identities[o.user.id];
      const val = c.community_kind === "heritage" ? id?.heritage : id?.faith;
      if (!val || !inGroup(c.community_kind as TaxKind, val.code, key, ctx.tax)) continue;
    }
    if (!includePlaced && inTopicPod(ctx, c, key, o.user.id)) continue;
    out.push(o);
  }
  return out;
}

interface JoinPick {
  pod: Pod;
  members: number;
  alreadyMember: boolean;
}

function findExisting(ctx: Ctx, c: Candidate, key: string, wide: boolean): JoinPick | null {
  const slack = wide ? Math.max(0, ctx.cfg.ageBandWide - ctx.cfg.ageBand) : 0;
  const rows = [];
  for (const pod of Object.values(ctx.db.pods)) {
    if (pod.status === "closed" || pod.type !== c.type || pod.community_kind !== c.community_kind) continue;
    if (pod.topic_key !== key || ctx.excluded.has(pod.id)) continue;
    const members = activeMemberIds(ctx.db, pod.id);
    const alreadyMember = members.includes(ctx.user.id);
    if (!alreadyMember) {
      if (members.length >= ctx.cfg.podMax) continue;
      if (ctx.age < pod.age_min - slack || ctx.age > pod.age_max + slack) continue;
      if (members.some((id) => ctx.blockedWith.has(id))) continue;
    }
    rows.push({ pod, memberCount: members.length, alreadyMember, upcoming: hasUpcomingHangout(ctx.db, pod.id) });
  }
  if (!rows.length) return null;
  const best = rankExisting(rows, {
    userId: ctx.user.id,
    age: ctx.age,
    podMax: ctx.cfg.podMax,
    preferUpcoming: ctx.cfg.preferUpcomingHangout,
  })[0];
  return { pod: best.pod, members: best.memberCount, alreadyMember: best.alreadyMember };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function newPodId(ctx: Ctx, c: Candidate, key: string): ID {
  let n = 1;
  for (const p of Object.values(ctx.db.pods)) if (p.topic_key === key && p.type === c.type) n++;
  return seedId("pod", n === 1 ? key : `${key}_${n}`);
}

interface Processed {
  result: PlacementResult;
  newPod?: NewPodPlan;
  /** For pods-at-start ranking. */
  meta: { upcoming: boolean; existing: boolean; widenRungs: number; ageDistance: number };
}

/** The exact spec sentence. "Only 3 Zambians nearby, so we widened to Southern African." */
export function widenSentence(count: number, fromLabel: string, fromPlural: string, toLabel: string): string {
  return `Only ${count} ${count === 1 ? fromLabel : fromPlural} nearby, so we widened to ${toLabel}.`;
}

export function waitlistNote(n: number): string {
  return n === 1 ? "We'll place you as soon as 1 more person joins." : `We'll place you as soon as ${n} more people join.`;
}

function processCandidate(ctx: Ctx, c: Candidate): Processed {
  const { cfg, user } = ctx;
  const steps: PlacementStep[] = [
    { rule: "metro", detail: `Near ${user.city}, Alabama`, pool_size: ctx.metroCount },
  ];
  if (ctx.blockedCount > 0) {
    steps.push({ rule: "blocks", detail: "Kept apart from people who are blocked either way", pool_size: ctx.blockedCount });
  }
  const rungs = buildLadder(c.chain.length);
  let narrowWideCount = 0; // pool of the narrowest group at the wide age band (the "Only N" number)
  let widestPool = 0;
  let widenedGroupNote: string | null = null;
  let widenedAge = false;

  for (const rung of rungs) {
    const g = c.chain[rung.groupIndex];
    const band = bandFor(rung.ageMode, cfg);
    const wide = rung.ageMode === "wide";
    const pool = poolFor(ctx, c, g.key, band);
    widestPool = Math.max(widestPool, pool.length);
    if (rung.kind === "start") {
      steps.push({ rule: "age_band", detail: `Ages ${ageRangeLabel(ctx.age, band, cfg)}`, pool_size: pool.length });
    } else if (rung.kind === "widen_age") {
      narrowWideCount = poolFor(ctx, c, g.key, band, true).length;
      widenedAge = true;
      steps.push({ rule: "widen_age", detail: `Widened ages to ${ageRangeLabel(ctx.age, band, cfg)}`, pool_size: pool.length });
    } else {
      const from = c.chain[0];
      widenedGroupNote = widenSentence(narrowWideCount, from.label, from.plural, g.label);
      steps.push({ rule: "widen_group", detail: widenedGroupNote, pool_size: narrowWideCount });
    }

    const note = (): string | null =>
      widenedGroupNote ?? (widenedAge ? "We widened ages a little to find your pod." : null);
    const widenRungs = rung.groupIndex + (widenedAge ? 1 : 0);

    // 3. Join existing
    const pick = findExisting(ctx, c, g.key, wide);
    if (pick) {
      const size = pick.alreadyMember ? pick.members : pick.members + 1;
      const left = Math.max(0, cfg.podMax - size);
      steps.push({ rule: "open_spots", detail: `${size} people in the pod, ${left} open ${left === 1 ? "spot" : "spots"}`, pool_size: size });
      return {
        result: {
          candidate: { type: c.type, community_kind: c.community_kind, topic_key: c.topic_key, label: c.label },
          outcome: "joined_existing",
          pod_id: pick.pod.id,
          steps,
          user_note: note(),
        },
        meta: {
          upcoming: hasUpcomingHangout(ctx.db, pick.pod.id),
          existing: true,
          widenRungs,
          ageDistance: Math.abs((pick.pod.age_min + pick.pod.age_max) / 2 - ctx.age),
        },
      };
    }

    // 4. Create new
    if (pool.length + 1 >= cfg.podMin) {
      const chosen = [...pool]
        .sort((a, b) => {
          const d = Math.abs(a.age - ctx.age) - Math.abs(b.age - ctx.age);
          return d !== 0 ? d : tieBreak(user.id, a.user.id) - tieBreak(user.id, b.user.id);
        })
        .slice(0, cfg.podTarget - 1);
      const ages = chosen.map((m) => m.age).concat(ctx.age);
      const id = newPodId(ctx, c, g.key);
      const topic = c.type === "interest" ? g.label : g.label;
      const pod: Pod = {
        id,
        name: c.type === "interest" ? `Huntsville ${g.label}` : `${cap(g.label)} · Huntsville`,
        photo_url: "",
        type: c.type,
        community_kind: c.community_kind,
        topic,
        topic_key: g.key,
        city: "Huntsville metro",
        age_min: Math.min(...ages),
        age_max: Math.max(...ages),
        widened_from:
          rung.groupIndex > 0
            ? { kind: "group", from: c.chain[0].label, to: g.label }
            : widenedAge
              ? { kind: "age", from: ageRangeLabel(ctx.age, cfg.ageBand, cfg), to: ageRangeLabel(ctx.age, cfg.ageBandWide, cfg) }
              : null,
        status: "active",
        created_at: ctx.now,
        hue: c.type === "interest" ? "ember" : "grove",
      };
      const size = chosen.length + 1;
      steps.push({ rule: "open_spots", detail: `Started a new pod with ${size} people`, pool_size: size });
      return {
        result: {
          candidate: { type: c.type, community_kind: c.community_kind, topic_key: c.topic_key, label: c.label },
          outcome: "created_new",
          pod_id: id,
          steps,
          user_note: note(),
        },
        newPod: { pod, member_ids: chosen.map((m) => m.user.id) },
        meta: { upcoming: false, existing: false, widenRungs, ageDistance: Math.abs(ages.reduce((a, b) => a + b, 0) / ages.length - ctx.age) },
      };
    }
  }

  // 5.3 Waitlist
  const n = Math.max(1, cfg.podMin - (widestPool + 1));
  const text = waitlistNote(n);
  steps.push({ rule: "waitlist", detail: text, pool_size: widestPool });
  return {
    result: {
      candidate: { type: c.type, community_kind: c.community_kind, topic_key: c.topic_key, label: c.label },
      outcome: "waitlisted",
      pod_id: null,
      steps,
      user_note: text,
    },
    meta: { upcoming: false, existing: false, widenRungs: 99, ageDistance: 99 },
  };
}

// ── public API ─────────────────────────────────────────────────────────

export function placeDetailed(
  user: User,
  identity: UserIdentity | null | undefined,
  interests: ID[],
  db: DbState,
  config: PlacementConfig,
  opts: PlaceOptions = {},
): PlacementOutcome {
  const now = opts.now ?? db.clock.virtual_at;
  const code = checkEligibility(user, config, { now, dryRun: opts.dryRun });
  if (code) return { ok: false, code };
  const tax = opts.taxonomy ?? DEFAULT_TAXONOMY;
  const ctx = buildCtx(db, user, config, tax, now, opts.excludePodIds ?? []);
  const candidates = opts.only ?? candidatesFor(identity, interests, db, config, tax);

  const processed: Processed[] = [];
  const newPods: NewPodPlan[] = [];
  for (const c of candidates) {
    const p = processCandidate(ctx, c);
    // A pod created for an earlier candidate in this same run must not be created twice.
    if (p.newPod) {
      newPods.push(p.newPod);
      ctx.db = { ...ctx.db, pods: { ...ctx.db.pods, [p.newPod.pod.id]: p.newPod.pod } };
    }
    processed.push(p);
  }

  // 7. Pods at start: best fit first, active; the rest deferred (on deck).
  const podsAtStart = opts.podsAtStart ?? db.config.flags.podsAtStart;
  if (!opts.only && podsAtStart === 2) {
    const placed = processed
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.result.outcome !== "waitlisted")
      .sort((a, b) => {
        const d = startFit(b.p.meta) - startFit(a.p.meta);
        return d !== 0 ? d : a.i - b.i;
      });
    for (const { p } of placed.slice(2)) {
      p.result.outcome = "deferred";
      p.result.steps.push({ rule: "pods_at_start", detail: "Opens after your first check-in", pool_size: 0 });
    }
  }
  return { ok: true, results: processed.map((p) => p.result), newPods };
}

/** Spec signature: place(user, identity, interests, db, config) -> PlacementResult[]. Empty when the user is not eligible. */
export function place(
  user: User,
  identity: UserIdentity | null | undefined,
  interests: ID[],
  db: DbState,
  config: PlacementConfig,
  opts: PlaceOptions = {},
): PlacementResult[] {
  const out = placeDetailed(user, identity, interests, db, config, opts);
  return out.ok ? out.results : [];
}

/** Convenience: place a user straight from the db (identity + interests looked up). */
export function placeUser(db: DbState, userId: ID, opts: PlaceOptions = {}): PlacementOutcome {
  const user = db.users[userId];
  if (!user) return { ok: false, code: "NOT_ACTIVE" };
  const interests = db.userInterests.filter((u) => u.user_id === userId).map((u) => u.interest_id);
  return placeDetailed(user, db.identities[userId], interests, db, db.config.placement, opts);
}

/**
 * Write a plan onto an immer draft: new pods, memberships (chosen bots + the user), waitlist entries.
 * Skips anything the user is already in. Returns nothing; build the PlacementRun with `makeRun`.
 */
export function applyPlacementPlan(d: DbState, plan: PlacementPlan, userId: ID, now: ISODateTime): void {
  for (const np of plan.newPods) {
    if (d.pods[np.pod.id]) continue;
    d.pods[np.pod.id] = np.pod;
    for (const uid of np.member_ids) pushMembership(d, np.pod.id, uid, "active", now);
  }
  for (const r of plan.results) {
    const key = r.candidate.topic_key;
    d.waitlist = d.waitlist.filter(
      (w) => !(w.user_id === userId && w.pod_kind === r.candidate.type && w.topic_key === key),
    );
    if (r.outcome === "waitlisted") {
      const entry: WaitlistEntry = {
        user_id: userId,
        pod_kind: r.candidate.type,
        topic_key: key,
        reason: "under_min",
        created_at: now,
      };
      d.waitlist.push(entry);
    } else if (r.pod_id) {
      pushMembership(d, r.pod_id, userId, r.outcome === "deferred" ? "on_deck" : "active", now);
    }
  }
}

function pushMembership(d: DbState, podId: ID, userId: ID, activation: Membership["activation"], now: ISODateTime) {
  if (d.memberships.some((m) => m.pod_id === podId && m.user_id === userId && !m.left_at)) return;
  d.memberships.push({
    pod_id: podId,
    user_id: userId,
    role: "member",
    muted: false,
    card_dismissed: false,
    card_dismissed_for: null,
    activation,
    joined_at: now,
    left_at: null,
  });
}

export function makeRun(id: ID, userId: ID, now: ISODateTime, results: PlacementResult[], dryRun = false): PlacementRun {
  const run: PlacementRun = { id, user_id: userId, created_at: now, results };
  if (dryRun) run.dry_run = true;
  return run;
}
