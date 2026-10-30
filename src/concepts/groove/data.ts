// Groove concept: read-only view of the real seed (src/data). Deterministic for the canonical anchor, safe in prerender.
import { DEMO } from "@/config/demo";
import { buildSeed } from "@/data/seed";
import { podMembers } from "@/lib/db/selectors";
import type { DbState, PlanJson, Venue } from "@/lib/types";

let cached: DbState | null = null;
export function seed(): DbState {
  if (!cached) cached = buildSeed(DEMO.anchor);
  return cached;
}

export type Hue = "ember" | "signal" | "grove";
export const HUE: Record<Hue, string> = { ember: "#FD6123", signal: "#1B78FE", grove: "#19C185" };

/** Display names: no city in chrome. */
const NAMES: Record<string, string> = {
  pod_hoopers: "Hoopers",
  pod_rocket_city_strings: "Strings",
  pod_southern_african: "Southern African",
  pod_adventist_young_adults: "Sabbath",
  pod_west_african: "West African",
  pod_muslim_young_adults: "Muslim",
};
export function podName(id: string): string {
  if (NAMES[id]) return NAMES[id];
  const raw = seed().pods[id]?.name ?? id;
  return raw.replace(/\s*·\s*Seattle/i, "").replace(/^(Seattle|Emerald City)\s+/i, "").replace(/\s+Seattle$/i, "");
}

/** Label colour per record. Interest pods alternate orange/blue so the crate reads; community pods are green. */
const HUE_OVERRIDE: Record<string, Hue> = { pod_rocket_city_strings: "signal" };
export function podHue(id: string): Hue {
  return HUE_OVERRIDE[id] ?? seed().pods[id]?.hue ?? "ember";
}

export interface Person {
  id: string;
  name: string;
  initial: string;
}
export function members(podId: string): Person[] {
  const db = seed();
  return podMembers(db, podId)
    .map((m) => db.users[m.user_id])
    .filter(Boolean)
    .map((u) => ({ id: u.id, name: u.first_name, initial: u.first_name.slice(0, 1) }));
}

/** The seeded first suggestion (a recorded Claude draft) and who was already in before you. */
export function starter(podId: string): { plan: PlanJson; going: string[] } | null {
  const db = seed();
  const s = Object.values(db.suggestions)
    .filter((x) => x.pod_id === podId && x.option_index === 0)
    .sort((a, b) => a.round - b.round)[0];
  if (!s) return null;
  const going = db.rsvps.filter((r) => r.hangout_id === s.id && r.status === "going").map((r) => r.user_id);
  return { plan: s.plan_json, going };
}

export function venue(id: string | undefined | null): Venue | null {
  return id ? (seed().venues[id] ?? null) : null;
}
export function venueShort(id: string | undefined | null): string {
  const v = venue(id);
  if (!v) return "";
  return (v.short_name ?? v.name).replace(/\s+Recreation Center$/i, " Rec");
}

/** Interest -> the pod it would place you in (interest pods only), and the community pod for roots. */
export function podForInterest(interestId: string): string | null {
  const p = Object.values(seed().pods).find((x) => x.type === "interest" && x.topic_key === interestId);
  return p?.id ?? null;
}
export const ROOTS_POD = DEMO.southernAfrican.podId;
export const HOOPERS = DEMO.hoopers.podId;
