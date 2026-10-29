// [U4] Deterministic analysis: time (from per-slot counts), dates, venue rules. Pure and isomorphic.
import { addDays, weekday } from "@/data/time";
import { SLOTS, SLOT_SHORT, type PlannerInput, type PlannerVenue, type Slot, type SlotCount } from "./types";

/** Ties prefer daytime weekend slots (public, safer first hangouts), then weekday evenings (Tue-Thu first), then
 *  weekend evenings, then weekday afternoons and mornings. */
const PREFERENCE: Slot[] = [
  "sunday-afternoon", "saturday-afternoon", "saturday-morning", "sunday-morning",
  "tuesday-evening", "wednesday-evening", "thursday-evening", "monday-evening", "friday-evening",
  "saturday-evening", "sunday-evening",
  "tuesday-afternoon", "wednesday-afternoon", "thursday-afternoon", "monday-afternoon", "friday-afternoon",
  "tuesday-morning", "wednesday-morning", "thursday-morning", "monday-morning", "friday-morning",
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

const WD: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
/** Next calendar date (YYYY-MM-DD) on/after `earliest` that falls on the slot's weekday. */
export function dateForSlot(slot: Slot, earliest: string): string {
  let d = earliest;
  const want = WD[slot.split("-")[0]];
  for (let i = 0; i < 8 && weekday(d) !== want; i++) d = addDays(d, 1);
  return d;
}

const HOURS = {
  weekday: { morning: { start: "09:00", end: "11:00" }, afternoon: { start: "13:00", end: "15:00" }, evening: { start: "18:00", end: "20:00" } },
  weekend: { morning: { start: "10:00", end: "12:00" }, afternoon: { start: "13:00", end: "15:00" }, evening: { start: "17:00", end: "19:00" } }, // Sun afternoon: BLUEPRINT D1, 1:00-3:00 PM
} as const;
export const SLOT_HOURS = Object.fromEntries(
  SLOTS.map((s) => {
    const [d, p] = s.split("-") as [string, "morning" | "afternoon" | "evening"];
    return [s, HOURS[d === "saturday" || d === "sunday" ? "weekend" : "weekday"][p]];
  }),
) as Record<Slot, { start: string; end: string }>;

/** Evening slots are after work and near dark: the planner prefers indoor places there. */
export const isEveningSlot = (slot: Slot) => slot.endsWith("-evening");

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
