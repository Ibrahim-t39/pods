// Paths concept: read-only view of the real seed (src/data). Deterministic for the canonical anchor, safe in prerender.
import { DEMO } from "@/config/demo";
import { buildSeed } from "@/data/seed";
import { podMembers } from "@/lib/db/selectors";
import type { DbState, Slot } from "@/lib/types";

let cached: DbState | null = null;
export function seed(): DbState {
  if (!cached) cached = buildSeed(DEMO.anchor);
  return cached;
}

export type Hue = "ember" | "signal" | "grove";
export const HOOPERS = DEMO.hoopers.podId;

/** Pod names without any city words (no-city rule). */
const CITY = /\s*·\s*Seattle|^(Seattle|Emerald City|Gas Works|Discovery)\s+|\s+Seattle$/gi;
const NAMES: Record<string, string> = {
  pod_hoopers: "Hoopers",
  pod_rocket_city_strings: "Strings",
  pod_southern_african: "Southern African",
  pod_west_african: "West African",
  pod_adventist_young_adults: "Sabbath",
  pod_muslim_young_adults: "Muslim young adults",
  pod_disc_golf: "Disc Club",
};
export function podName(id: string): string {
  if (NAMES[id]) return NAMES[id];
  return (seed().pods[id]?.name ?? id).replace(CITY, "").trim();
}

/** What the pod does, in two or three words (shown small under the name). */
export function podActivity(id: string): string {
  const p = seed().pods[id];
  if (!p) return "";
  return p.type === "community" ? "community pod" : p.topic;
}

export interface Person { id: string; name: string; initial: string }
export function members(podId: string): Person[] {
  const db = seed();
  return podMembers(db, podId)
    .map((m) => db.users[m.user_id])
    .filter(Boolean)
    .map((u) => ({ id: u.id, name: u.first_name, initial: u.first_name.slice(0, 1) }));
}
export function person(id: string): Person | null {
  const u = seed().users[id];
  return u ? { id, name: u.first_name, initial: u.first_name.slice(0, 1) } : null;
}

/** Who was already in for the starter hangout before you arrived (seed rsvps). */
export function goingBefore(podId: string): string[] {
  const db = seed();
  const s = Object.values(db.suggestions)
    .filter((x) => x.pod_id === podId && x.option_index === 0)
    .sort((a, b) => a.round - b.round)[0];
  if (!s) return [];
  return db.rsvps.filter((r) => r.hangout_id === s.id && r.status === "going").map((r) => r.user_id);
}

/** Interests shown as stepping stones (ids from config/interests). */
export const STONES: { id: string; label: string }[] = [
  { id: "basketball", label: "basketball" },
  { id: "guitar", label: "guitar" },
  { id: "running", label: "running" },
  { id: "hiking", label: "hiking" },
  { id: "soccer", label: "soccer" },
  { id: "board_games", label: "board games" },
  { id: "books", label: "books" },
  { id: "photography", label: "photography" },
  { id: "pickleball", label: "pickleball" },
  { id: "art", label: "art" },
];

export const COMMUNITY: { id: string; label: string }[] = [
  { id: "pod_southern_african", label: "Southern African" },
  { id: "pod_west_african", label: "West African" },
  { id: "pod_adventist_young_adults", label: "Adventist" },
  { id: "pod_muslim_young_adults", label: "Muslim" },
];

export function podForInterest(interestId: string): string | null {
  const p = Object.values(seed().pods).find((x) => x.type === "interest" && x.topic_key === interestId);
  return p?.id ?? null;
}

export const DAYS: { day: string; slots: { slot: Slot; label: string }[] }[] = [
  { day: "Sat", slots: [{ slot: "saturday-morning", label: "morning" }, { slot: "saturday-afternoon", label: "afternoon" }, { slot: "saturday-evening", label: "evening" }] },
  { day: "Sun", slots: [{ slot: "sunday-morning", label: "morning" }, { slot: "sunday-afternoon", label: "afternoon" }, { slot: "sunday-evening", label: "evening" }] },
];

export function venueShort(id: string | null | undefined): string {
  if (!id) return "";
  const v = seed().venues[id];
  if (!v) return "";
  return (v.short_name ?? v.name).replace(/\s+Recreation Center$/i, " Rec");
}
export function venueAddress(id: string | null | undefined): string {
  if (!id) return "";
  return seed().venues[id]?.address ?? "";
}
