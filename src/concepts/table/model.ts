// TABLE concept: pure read helpers over the real DbState. The store, seed, repo and planner stay the source of truth.
import { hash32 } from "@/lib/ids";
import { myMemberships } from "@/lib/db/selectors";
import type { DbState, HangoutSuggestion, ID, Pod, Slot, Venue } from "@/lib/types";

export type Hue = "ember" | "signal" | "grove";
export const HUE_VAR: Record<Hue, string> = { ember: "var(--tb-ember)", signal: "var(--tb-signal)", grove: "var(--tb-grove)" };

/** Faces: the logo's three colours + its three overlap colours (brand/mark.svg). You are always ink. */
const DISC = ["var(--tb-ember)", "var(--tb-signal)", "var(--tb-grove)", "var(--tb-ember-deep)", "var(--tb-signal-deep)", "var(--tb-grove-deep)"];
export const discColor = (id: ID) => DISC[hash32(`table:${id}`) % DISC.length];

const CITY = /\s*·\s*Huntsville\b|\bHuntsville\s+|\s+Huntsville\b|\bRocket City\s+/g;
/** Table names never carry the city (product rule 5). */
export function tableName(p: Pod): string {
  return p.name.replace(CITY, "").trim() || p.topic;
}

export interface Person {
  id: ID;
  name: string;
  initial: string;
  color: string;
  me: boolean;
}

export interface MyTable {
  pod: Pod;
  name: string;
  hue: Hue;
  open: boolean;
  people: Person[];
  next: string | null; // ISO of the next locked/proposed start
}

export function people(db: DbState, podId: ID): Person[] {
  const list = db.memberships
    .filter((m) => m.pod_id === podId && !m.left_at)
    .map((m) => db.users[m.user_id])
    .filter(Boolean)
    .map((u) => {
      const name = u.nickname?.trim() || u.first_name || "You";
      const me = u.id === db.me;
      return { id: u.id, name, initial: name.slice(0, 1).toUpperCase(), color: me ? "var(--tb-ink)" : discColor(u.id), me };
    });
  list.sort((a, b) => (a.me ? -1 : b.me ? 1 : hash32(a.id) - hash32(b.id)));
  return list;
}

export function myTables(db: DbState): MyTable[] {
  const ms = myMemberships(db).filter((m) => db.pods[m.pod_id]);
  const nextOf = (podId: ID) => {
    const hs = Object.values(db.hangouts)
      .filter((h) => h.pod_id === podId && h.status === "upcoming")
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    if (hs[0]) return hs[0].starts_at;
    const s = Object.values(db.suggestions)
      .filter((x) => x.pod_id === podId && x.status === "suggested")
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
    return s?.starts_at ?? null;
  };
  const rows = ms.map((m) => {
    const pod = db.pods[m.pod_id];
    return {
      pod,
      name: tableName(pod),
      hue: (pod.hue ?? (pod.type === "community" ? "grove" : "ember")) as Hue,
      open: m.activation !== "on_deck",
      people: people(db, pod.id),
      next: nextOf(pod.id),
    };
  });
  // Open tables first, then the soonest.
  rows.sort((a, b) => Number(b.open) - Number(a.open) || (a.next ?? "9").localeCompare(b.next ?? "9"));
  // Two tables never share a hue on screen when it can be avoided.
  const used = new Set<Hue>();
  for (const r of rows) {
    if (used.has(r.hue)) r.hue = (["ember", "signal", "grove"] as Hue[]).find((h) => !used.has(h)) ?? r.hue;
    used.add(r.hue);
  }
  return rows;
}

/** Two-word margin captions (PB 1.4; TS 2, 7, 12). */
export function captions(db: DbState, s: HangoutSuggestion | null): { place: string; sky: string; rain: string } | null {
  if (!s) return null;
  const v: Venue | undefined = db.venues[s.venue_id];
  const place = v ? shortVenue(v) : "A public place";
  const rainV = s.plan_json.rain_venue_id ? db.venues[s.plan_json.rain_venue_id] : undefined;
  const wx = s.trace.find((t) => t.id === "weather")?.detail ?? "";
  const sky = v?.indoor ? "Indoors" : /rain|storm|shower/i.test(wx) ? "Rain likely" : /clear|sun|dry/i.test(wx) ? "Clear sky" : "Open air";
  const rain = v?.indoor ? "Rain-proof" : rainV ? `Rain: ${shortVenue(rainV)}` : "Rain: reschedule";
  return { place, sky, rain };
}

export function shortVenue(v: Venue): string {
  const n = (v.short_name || v.name).replace(/\s*(Recreation|Rec)\s+Center$/i, " Rec").replace(/^Dr\.\s+/, "");
  return n.length > 22 ? `${n.slice(0, 21).trim()}…` : n;
}

// ── Onboarding vocabulary ───────────────────────────────────────────────
export const SHORT: Record<string, string> = {
  basketball: "Basketball", pickleball: "Pickleball", running: "Running", hiking: "Hiking", climbing: "Climbing",
  soccer: "Soccer", disc_golf: "Disc golf", guitar: "Guitar", music_making: "Making music", board_games: "Board games",
  books: "Books", art: "Art", photography: "Photos", volunteering: "Volunteering",
};

export const FREE: { id: "weeknights" | "saturdays" | "sundays"; label: string; slots: Slot[] }[] = [
  { id: "weeknights", label: "Weeknights", slots: ["weekday-evening"] },
  { id: "saturdays", label: "Saturdays", slots: ["saturday-morning", "saturday-afternoon"] },
  { id: "sundays", label: "Sundays", slots: ["sunday-morning", "sunday-afternoon"] },
];

/** Position on a circle (0° = 3 o'clock, 90° = 6 o'clock), as % of the square. */
export function onCircle(deg: number, r: number) {
  const a = (deg * Math.PI) / 180;
  return { left: `${50 + r * 100 * Math.cos(a)}%`, top: `${50 + r * 100 * Math.sin(a)}%` };
}
