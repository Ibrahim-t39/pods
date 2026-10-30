// Lens concept data: everything comes from the real seed (src/data) and config; nothing here is invented.
"use client";

import { buildSeed } from "@/data/seed";
import { DEMO } from "@/config/demo";
import type { DbState, Slot } from "@/lib/types";

let cached: DbState | null = null;
/** The deterministic seed world, built once on the client (pure: no Date.now, no Math.random). */
export function seedDb(): DbState {
  if (!cached) cached = buildSeed(DEMO.anchor);
  return cached;
}

export type Hue = "ember" | "signal" | "grove";
export const HUE: Record<Hue, string> = { ember: "#FD6123", signal: "#1B78FE", grove: "#19C185" };

/** Chanda's three pods. One word each, the lens word (guardrail: 1-3 words in a lens). */
export const PODS = [
  { id: DEMO.hoopers.podId, word: "Hoops", hue: "ember" as Hue },
  { id: "pod_rocket_city_strings", word: "Strings", hue: "signal" as Hue },
  { id: DEMO.southernAfrican.podId, word: "Roots", hue: "grove" as Hue },
];
export type PodId = (typeof PODS)[number]["id"];

export interface Person {
  id: string;
  name: string;
  slots: Slot[];
}

export function podPeople(podId: string): Person[] {
  const db = seedDb();
  return db.memberships
    .filter((m) => m.pod_id === podId && m.left_at === null)
    .map((m) => db.users[m.user_id])
    .filter(Boolean)
    .map((u) => ({ id: u.id, name: u.first_name, slots: u.availability }));
}

/** The three Hoopers already in before Chanda (seed rsvps on the starter suggestion). */
export function alreadyIn(): Person[] {
  const db = seedDb();
  const ids = db.rsvps.filter((r) => r.hangout_id === DEMO.hoopers.suggestionId && r.status === "going").map((r) => r.user_id);
  return podPeople(DEMO.hoopers.podId).filter((p) => ids.includes(p.id));
}

/** The seven buckets, in week order. Labels are what a sheet column says, nothing more. */
export const SLOT_ORDER: { slot: Slot; label: string }[] = [
  { slot: "weekday-evening", label: "weeknights" },
  { slot: "saturday-morning", label: "sat am" },
  { slot: "saturday-afternoon", label: "sat pm" },
  { slot: "saturday-evening", label: "sat eve" },
  { slot: "sunday-morning", label: "sun am" },
  { slot: "sunday-afternoon", label: "sun pm" },
  { slot: "sunday-evening", label: "sun eve" },
];

/** Interest words you drag into your circle. id = config/interests id. Hue alternates the two interest inks. */
export const LOVES: { id: string; word: string; hue: Hue }[] = [
  { id: "basketball", word: "hoops", hue: "ember" },
  { id: "guitar", word: "guitar", hue: "signal" },
  { id: "running", word: "running", hue: "ember" },
  { id: "books", word: "books", hue: "signal" },
  { id: "climbing", word: "climbing", hue: "ember" },
  { id: "board_games", word: "games", hue: "signal" },
  { id: "hiking", word: "hiking", hue: "ember" },
  { id: "photography", word: "photos", hue: "signal" },
  { id: "soccer", word: "soccer", hue: "ember" },
  { id: "art", word: "art", hue: "signal" },
  { id: "music_making", word: "beats", hue: "ember" },
  { id: "volunteering", word: "giving", hue: "signal" },
];

/** Where home is. Optional, private, and only ever turned into a pod (never shown on a profile). */
export const ROOTS: { id: string; word: string }[] = [
  { id: "zambian", word: "Zambia" },
  { id: "nigerian", word: "Nigeria" },
  { id: "ghanaian", word: "Ghana" },
  { id: "kenyan", word: "Kenya" },
  { id: "jamaican", word: "Jamaica" },
  { id: "haitian", word: "Haiti" },
  { id: "ethiopian", word: "Ethiopia" },
];

export function initials(name: string) {
  return name.slice(0, 1).toUpperCase();
}

/** "2026-11-08T13:00:00" → { day: "Sun", date: "Nov 8", time: "1", span: "1–3" } in Seattle wall time (string math only). */
export function wallTime(startISO: string, endISO?: string) {
  const d = new Date(startISO.slice(0, 10) + "T12:00:00Z");
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()];
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()];
  const h = (iso: string) => {
    const hh = Number(iso.slice(11, 13));
    const mm = iso.slice(14, 16);
    const h12 = hh % 12 === 0 ? 12 : hh % 12;
    return mm === "00" ? `${h12}` : `${h12}:${mm}`;
  };
  const ampm = (iso: string) => (Number(iso.slice(11, 13)) >= 12 ? "pm" : "am");
  const start = h(startISO);
  const end = endISO ? h(endISO) : null;
  return {
    day,
    date: `${month} ${d.getUTCDate()}`,
    dayNum: d.getUTCDate(),
    time: start,
    span: end ? `${start}–${end}${ampm(endISO!)}` : `${start}${ampm(startISO)}`,
  };
}
