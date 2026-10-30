// CANOPY concept: pure read helpers over the real DbState. Store, seed, repo and planner stay the source of truth;
// this file only shapes what one "ground" (one pod) needs to draw.
import { lockMinFor } from "@/lib/planner/lock";
import { cardView, type CardView } from "@/lib/planner/card-state";
import { goingUserIds, myMemberships, podMembers } from "@/lib/db/selectors";
import { candidateVenues } from "@/data/plans";
import { hash32 } from "@/lib/ids";
import type { DbState, HangoutSuggestion, ID, Pod, Slot, Venue } from "@/lib/types";

export type Hue = "ember" | "signal" | "grove";

/** City words never reach the product chrome (playbook rule 5). "Hoopers" → "Hoopers". */
const CITY = /\b(Seattle|Emerald City|Bellevue|Shoreline|Washington|UW)\b\s*·?\s*/g;
export function podWord(db: DbState, p: Pod): string {
  if (p.type === "community" && db.config.flags.maskCommunityInApp) return "Community";
  const n = p.name.replace(CITY, "").replace(/\s{2,}/g, " ").replace(/^[\s·]+|[\s·]+$/g, "").trim();
  return n || p.topic;
}

export interface GroundRef {
  id: ID;
  word: string;
  hue: Hue;
  onDeck: boolean;
}

/** My pods in a stable order: active first, the soonest plan first. */
export function myGrounds(db: DbState): GroundRef[] {
  const ms = myMemberships(db).filter((m) => db.pods[m.pod_id]);
  const soon = (podId: ID) => {
    const s = Object.values(db.suggestions).filter((x) => x.pod_id === podId && x.status !== "replaced");
    return s.length ? Math.min(...s.map((x) => Date.parse(x.starts_at))) : Number.MAX_SAFE_INTEGER;
  };
  ms.sort((a, b) => (a.activation === b.activation ? soon(a.pod_id) - soon(b.pod_id) || a.pod_id.localeCompare(b.pod_id) : a.activation === "active" ? -1 : 1));
  // Each ground owns one hue so walking sideways is a change of light: interest pods alternate ember / signal,
  // community pods are grove (PB 4.2; IL 51/76/52 colour as wayfinding).
  let k = 0;
  return ms.map((m) => {
    const pod = db.pods[m.pod_id];
    const hue: Hue = pod.type === "community" ? "grove" : k++ % 2 === 0 ? "ember" : "signal";
    return { id: pod.id, word: podWord(db, pod), hue, onDeck: m.activation === "on_deck" };
  });
}

export interface Person {
  id: ID;
  name: string;
  initial: string;
  me: boolean;
  tone: number; // 0..5, which flat disc tone (logo hues + their overlaps)
}

export function people(db: DbState, podId: ID): Person[] {
  return podMembers(db, podId)
    .map((m) => db.users[m.user_id])
    .filter(Boolean)
    .map((u) => {
      const name = u.nickname?.trim() || u.first_name || "You";
      return { id: u.id, name, initial: name.slice(0, 1).toUpperCase(), me: u.id === db.me, tone: hash32(`canopy:${u.id}`) % 6 };
    })
    .sort((a, b) => (a.me ? 1 : b.me ? -1 : hash32(a.id) - hash32(b.id)));
}

/** Which slot words the week sweep shows, in week order. */
export const WEEK: { slot: Slot; day: string; part: string }[] = [
  { slot: "wednesday-evening", day: "wk", part: "eve" },
  { slot: "saturday-morning", day: "sat", part: "am" },
  { slot: "saturday-afternoon", day: "sat", part: "pm" },
  { slot: "saturday-evening", day: "sat", part: "eve" },
  { slot: "sunday-morning", day: "sun", part: "am" },
  { slot: "sunday-afternoon", day: "sun", part: "pm" },
  { slot: "sunday-evening", day: "sun", part: "eve" },
];

/** Counts only: how many members are free per slot (the planner never sees who). */
export function freeCounts(db: DbState, podId: ID): Record<Slot, number> {
  const out = Object.fromEntries(WEEK.map((w) => [w.slot, 0])) as Record<Slot, number>;
  for (const m of podMembers(db, podId)) for (const s of db.users[m.user_id]?.availability ?? []) if (s in out) out[s]++;
  return out;
}

export function slotOf(iso: string): Slot {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "America/Los_Angeles" }).format(d);
  const h = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "America/Los_Angeles" }).format(d));
  const part = h < 12 ? "morning" : h < 16 ? "afternoon" : "evening";
  if (day === "Sat") return `saturday-${part}` as Slot;
  if (day === "Sun") return `sunday-${part}` as Slot;
  return "wednesday-evening";
}

const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", ...o }).format(new Date(iso));
export const dayWord = (iso: string) => fmt(iso, { weekday: "long" });
export const dateShort = (iso: string) => fmt(iso, { month: "short", day: "numeric" }).toLowerCase();
export const timeShort = (iso: string) => fmt(iso, { hour: "numeric", minute: "2-digit" }).replace(":00", "").replace(" ", "").toLowerCase();

/** "the courts", "the park", ...: the kind of place, shown before lock (the name lands at lock). */
export function placeKind(v: Venue | null | undefined): string {
  if (!v) return "a public spot";
  const k: Record<Venue["type"], string> = {
    park: "the park", court: "the courts", library: "the library", cafe: "a café", community_center: "the rec courts", museum: "the museum",
    trail: "the trail", studio: "the studios", restaurant: "a table", church_hall: "the hall", campus: "campus",
  };
  return k[v.type] ?? "a public spot";
}
export const venueName = (v: Venue | null | undefined) => (v ? v.short_name ?? v.name : "");

export interface Ground {
  ref: GroundRef;
  view: CardView | null;
  people: Person[];
  /** going user ids on the current target, in RSVP order */
  going: ID[];
  venue: Venue | null;
  rainVenue: Venue | null;
  s: HangoutSuggestion | null;
  free: Record<Slot, number>;
  fits: number; // public venues that fit the topic (for "why")
  size: number;
  threshold: number;
  meInitial: string;
}

export function ground(db: DbState, ref: GroundRef, nowMs: number): Ground {
  const view = cardView(db, ref.id, nowMs);
  const s = view?.suggestion ?? null;
  const target = view?.targetId ?? null;
  const going = target ? goingUserIds(db, target) : [];
  const venue = view?.venue ?? null;
  const rainId = s?.plan_json.rain_venue_id ?? null;
  const pod = db.pods[ref.id];
  const me = db.me ? db.users[db.me] : null;
  return {
    ref,
    view,
    people: people(db, ref.id),
    going,
    venue,
    rainVenue: rainId ? (db.venues[rainId] ?? null) : null,
    s,
    free: freeCounts(db, ref.id),
    fits: candidateVenues(pod?.topic_key ?? "").length,
    size: podMembers(db, ref.id).length,
    threshold: lockMinFor(db, s),
    meInitial: (me?.nickname || me?.first_name || "Y").slice(0, 1).toUpperCase(),
  };
}

/** The ground that needs you: an open ask (check-in, ballot, vote, plan) first, else the soonest plan. */
export function groundThatNeedsYou(db: DbState, nowMs: number): ID | null {
  const refs = myGrounds(db).filter((r) => !r.onDeck);
  const rank = (id: ID) => {
    const v = cardView(db, id, nowMs);
    if (!v) return 9;
    if (["check_in", "ballot", "vote", "planning_next"].includes(v.phase)) return 0;
    if (v.phase === "proposed") return 1;
    if (["locked", "in", "starting_soon", "happening_now"].includes(v.phase)) return 2;
    return 3;
  };
  const best = [...refs].sort((a, b) => rank(a.id) - rank(b.id))[0];
  return best?.id ?? myGrounds(db)[0]?.id ?? null;
}

/** Light state of the surface (PB 4.4): dawn while planning, still when locked, dusk after. */
export type Light = "dawn" | "still" | "dusk" | "rest";
export function lightOf(v: CardView | null, onDeck: boolean): Light {
  if (onDeck || !v) return "rest";
  if (["check_in", "ballot", "waiting_reveal", "planning_next", "missed", "vote"].includes(v.phase)) return "dusk";
  if (["locked", "starting_soon", "happening_now"].includes(v.phase)) return "still";
  return "dawn";
}
