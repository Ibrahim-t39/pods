// [U4] Deterministic analysis: time (from per-slot counts), dates, venue rules. Pure and isomorphic.
import { addDays, weekday } from "@/data/time";
import { SLOTS, SLOT_SHORT, type PlannerInput, type PlannerVenue, type Slot, type SlotCount } from "./types";

/** Ties prefer daytime weekend slots (public, safer first hangouts). */
const PREFERENCE: Slot[] = [
  "sunday-afternoon", "saturday-afternoon", "saturday-morning", "sunday-morning",
  "weekday-evening", "saturday-evening", "sunday-evening",
];

export function rankSlots(availability: SlotCount[]): SlotCount[] {
  const counts = new Map<Slot, number>(SLOTS.map((s) => [s, 0]));
  for (const a of availability) counts.set(a.slot, (counts.get(a.slot) ?? 0) + Math.max(0, a.free | 0));
  return [...PREFERENCE]
    .map((slot) => ({ slot, free: counts.get(slot) ?? 0 }))
    .sort((a, b) => b.free - a.free || PREFERENCE.indexOf(a.slot) - PREFERENCE.indexOf(b.slot));
}

/** Best slot from counts. With fewer than `minSharers` people sharing times, default to weekend daytime. */
export function bestSlot(input: PlannerInput): { slot: Slot; free: number; shared: number; fewShared: boolean; ranked: SlotCount[] } {
  const ranked = rankSlots(input.availability);
  const fewShared = input.sharers < input.rules.minSharers || (ranked[0]?.free ?? 0) === 0;
  if (fewShared) return { slot: "saturday-afternoon", free: ranked.find((r) => r.slot === "saturday-afternoon")?.free ?? 0, shared: input.sharers, fewShared, ranked };
  return { slot: ranked[0].slot, free: ranked[0].free, shared: input.sharers, fewShared, ranked };
}

/** "Sun afternoon: 7 of 8 free · Weekday evening: 6 of 8" (top two non-zero slots). */
export function topTwoText(ranked: SlotCount[], size: number): string {
  return ranked
    .filter((r) => r.free > 0)
    .slice(0, 2)
    .map((r, i) => `${SLOT_SHORT[r.slot]}: ${r.free} of ${size}${i === 0 ? " free" : ""}`)
    .join(" · ");
}

/** Next calendar date (YYYY-MM-DD) on/after `earliest` that matches the slot's weekday (weekday evenings: Tue-Thu). */
export function dateForSlot(slot: Slot, earliest: string): string {
  let d = earliest;
  const ok = (wd: number) => (slot.startsWith("saturday") ? wd === 6 : slot.startsWith("sunday") ? wd === 0 : wd >= 2 && wd <= 4);
  for (let i = 0; i < 8 && !ok(weekday(d)); i++) d = addDays(d, 1);
  return d;
}

export const SLOT_HOURS: Record<Slot, { start: string; end: string }> = {
  "weekday-evening": { start: "18:00", end: "20:00" },
  "saturday-morning": { start: "10:00", end: "12:00" },
  "saturday-afternoon": { start: "13:00", end: "15:00" },
  "saturday-evening": { start: "17:00", end: "19:00" },
  "sunday-morning": { start: "10:00", end: "12:00" },
  "sunday-afternoon": { start: "13:00", end: "15:00" }, // BLUEPRINT D1: Sun 1:00-3:00 PM
  "sunday-evening": { start: "17:00", end: "19:00" },
};

/** Planner rules: public venues only, not alcohol-centered, within budget, suited to the topic, no recent repeats. */
export function candidateVenues(input: PlannerInput) {
  const safe = input.venues.filter((v) => v.isPublic && !v.alcoholCentered && v.costPerPerson <= input.budgetMax);
  const key = input.pod.fitKey.toLowerCase();
  const suited = safe.filter((v) => v.goodFor.some((g) => g.toLowerCase() === key));
  const pool = suited.length ? suited : safe.filter((v) => v.goodFor.includes("any"));
  const recent = new Set(input.pastHangouts.slice(-2).map((h) => h.venueId));
  const avoidPlace = input.avoid?.prefs?.includes("different_place");
  // After a run-it-back the pod asked for "again", so the same place is welcome; otherwise skip the last two venues.
  const excludeRecent = input.hangoutNumber > 1 && !input.context;
  const fresh = pool.filter((v) => !(avoidPlace && v.id === input.avoid?.venueId) && !(excludeRecent && recent.has(v.id)));
  return {
    safeCount: safe.length,
    suitedCount: pool.length,
    candidates: fresh.length ? fresh : pool,
    indoor: safe.filter((v) => v.indoor) as PlannerVenue[],
  };
}

export const venueLabel = (v: Pick<PlannerVenue, "name" | "shortName">) => v.shortName ?? v.name;
export const hhmmToMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
export const minToHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
