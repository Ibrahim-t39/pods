// How many "I'm in" a plan needs before it locks, per plan (not one global number). The AI (or this rule table when
// it is offline) picks min_to_lock, an optional max_seats and a one-line lock_reason from the activity and the pod
// size; the pod can nudge it with the − / + stepper. Old plans without the field fall back to
// config.planner.lockThreshold. Pure and isomorphic: imported by the lock transaction, the card state, the crowd
// simulation, metrics, chat AI and the UI.
import type { DbState, HangoutSuggestion, ID } from "@/lib/types";

export interface LockRule {
  min_to_lock: number;
  max_seats?: number;
  lock_reason: string;
}

/** The smallest group that still makes a hangout. */
export const LOCK_FLOOR = 2;
/** A pod's first hangout never locks with fewer than 3: two strangers alone is not a pod meeting. */
export const FIRST_FLOOR = 3;
/** The one lock phrase, everywhere a plan shows its count: "1 more and it's on", then "Locked". */
export const LOCKED_WORD = "Locked";
export function lockCopy(need: number, locked = false): string {
  return locked || need <= 0 ? LOCKED_WORD : `${need} more and it's on`;
}

/** Seats when a class or studio booking needs a headcount and the venue gives no number. */
export const CLASS_SEATS = 8;

type Base = { min: number; reason: string; team?: boolean };
/** Keyed by interest id, community key, or the planner's neutral template alias. */
const BASE: Record<string, Base> = {
  basketball: { min: 4, reason: "Four is enough for a game. More can join.", team: true },
  soccer: { min: 4, reason: "A small-sided game works with 4; more can join", team: true },
  pickleball: { min: 4, reason: "Doubles needs 4 on a court" },
  running: { min: 2, reason: "Two is enough for an easy loop" },
  hiking: { min: 3, reason: "Three on a trail, so nobody walks alone" },
  trail_walk: { min: 3, reason: "Three on a trail, so nobody walks alone" },
  sda: { min: 3, reason: "Three on a trail, so nobody walks alone" },
  volunteering: { min: 3, reason: "Three makes a real crew" },
  climbing: { min: 3, reason: "Three lets you take turns on the wall" },
  climbing_gym: { min: 3, reason: "Three lets you take turns on the wall" },
  disc_golf: { min: 3, reason: "A group of 3 keeps a round moving" },
  guitar: { min: 3, reason: "A jam needs at least 3" },
  music_making: { min: 3, reason: "Three makes a listening round" },
  board_games: { min: 3, reason: "Most games play well with 3" },
  books: { min: 3, reason: "Three makes it a real swap" },
  art: { min: 3, reason: "Three makes a good studio walk" },
  photography: { min: 3, reason: "Three makes a walk feel like a group" },
  picnic: { min: 3, reason: "Three makes it a picnic" },
  picnic_alt: { min: 3, reason: "Three makes it a picnic" },
  southern_african: { min: 3, reason: "Three makes it a picnic" },
  west_african: { min: 3, reason: "Three makes it a picnic" },
  coffee: { min: 3, reason: "Three keeps the table talking" },
  muslim: { min: 3, reason: "Three keeps the table talking" },
};

const CLASS_TEXT = /\b(paint|sip|class|workshop|lesson)\b/i;
/** "5v5", "5-on-5", "full court" → players needed for the format. */
function teamFormat(text: string): number | null {
  if (/full[- ]court/i.test(text)) return 10;
  const m = /\b([2-6])\s?(?:v|vs\.?|-on-|on)\s?\1\b/i.exec(text);
  return m ? Number(m[1]) * 2 : null;
}

/** Keep a number inside 2..pod size (a pod smaller than 2 locks at its size). */
export function clampLock(n: number, size: number): number {
  const top = Math.max(1, size);
  return Math.max(Math.min(LOCK_FLOOR, top), Math.min(Math.round(n), top));
}

/**
 * The rule-based choice. `text` (event/summary) spots a class booking; `format` (a title someone typed, e.g. "5v5 at
 * Miller") spots a team format the pod may be too small for. Template copy is never parsed for a format.
 */
export function lockRule(o: { key: string; size: number; text?: string; format?: string; venue?: { type: string; costPerPerson?: number } | null; fallback?: number }): LockRule {
  const size = Math.max(1, o.size);
  const text = o.text ?? "";
  const base = BASE[o.key] ?? { min: o.fallback ?? 4, reason: "Enough to make it feel like a hangout" };

  // A class or paint-and-sip needs a headcount for the booking.
  if (CLASS_TEXT.test(text) || (o.venue?.type === "studio" && (o.venue.costPerPerson ?? 0) > 0)) {
    return { min_to_lock: clampLock(3, size), max_seats: CLASS_SEATS, lock_reason: "Booking needs a headcount" };
  }

  // A team sport asked for a format bigger than the pod: pick the biggest one that fits and say so.
  if (base.team) {
    const want = teamFormat(o.format ?? "");
    if (want && want > size) {
      const per = Math.max(2, Math.floor(size / 2));
      const fit = Math.min(per * 2, size);
      return { min_to_lock: clampLock(fit, size), lock_reason: `${want / 2}v${want / 2} needs ${want}, so ${per}v${per} with ${fit}` };
    }
    if (want && want <= size && want > base.min) return { min_to_lock: want, lock_reason: `${want / 2}v${want / 2} needs ${want}` };
  }

  const min = clampLock(base.min, size);
  if (min < base.min) return { min_to_lock: min, lock_reason: `Your pod has ${size}, so it locks at ${min}` };
  return { min_to_lock: min, lock_reason: base.reason };
}

/** Accept the AI's numbers when they are sane, else the rule. Never above pod size, never below 2. */
export function resolveLock(proposed: Partial<LockRule> | undefined, rule: LockRule, size: number): LockRule {
  const n = proposed?.min_to_lock;
  if (typeof n !== "number" || !Number.isFinite(n)) return rule;
  const min = clampLock(n, size);
  const reason = (proposed?.lock_reason ?? "").trim().slice(0, 90);
  const seats = typeof proposed?.max_seats === "number" && proposed.max_seats >= min ? Math.round(proposed.max_seats) : rule.max_seats;
  const out: LockRule = {
    min_to_lock: min,
    lock_reason: min !== Math.round(n) ? `Your pod has ${size}, so it locks at ${min}` : reason || rule.lock_reason,
  };
  if (seats) out.max_seats = seats;
  return out;
}

/** The one place every reader gets a plan's lock number. */
export function lockMinFor(db: Pick<DbState, "config">, s: Pick<HangoutSuggestion, "min_to_lock"> | null | undefined): number {
  const n = s?.min_to_lock;
  return typeof n === "number" && n >= 1 ? n : db.config.planner.lockThreshold;
}

/** Lock number for an RSVP target (a suggestion id, or a hangout id whose suggestion carries the number). */
export function lockMinForTarget(db: Pick<DbState, "config" | "suggestions" | "hangouts">, targetId: ID | null | undefined): number {
  if (!targetId) return db.config.planner.lockThreshold;
  const s = db.suggestions[targetId] ?? (db.hangouts[targetId] ? db.suggestions[db.hangouts[targetId].suggestion_id ?? ""] : undefined);
  return lockMinFor(db, s);
}

/** Stepper bounds: 2 (3 on a pod's hangout #1) to pod size, and never below the people already in. */
export function lockBounds(size: number, going: number, seats?: number, first = false): { min: number; max: number } {
  const max = Math.max(1, seats ? Math.min(size, seats) : size);
  const min = Math.min(max, Math.max(first ? FIRST_FLOOR : LOCK_FLOOR, going));
  return { min, max };
}

/** True while the pod has never had a hangout (so the plan in front of it is #1). */
export function isFirstHangout(db: Pick<DbState, "hangouts">, podId: ID): boolean {
  return !Object.values(db.hangouts).some((h) => h.pod_id === podId && h.status !== "cancelled");
}

/** The rule for a pod in the db (member proposals, starters, anything saved without a number). */
export function lockRuleForPod(db: Pick<DbState, "config" | "pods" | "memberships">, podId: ID, text?: string, venue?: { type: string; cost_per_person?: number } | null, format?: string): LockRule {
  const pod = db.pods[podId];
  const size = db.memberships.filter((m) => m.pod_id === podId && !m.left_at).length;
  return lockRule({
    key: pod?.topic_key ?? "", size, text, format, fallback: db.config.planner.lockThreshold,
    venue: venue ? { type: venue.type, costPerPerson: venue.cost_per_person } : null,
  });
}
