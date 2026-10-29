// Week-specific exceptions to the usual week ("Busy this Saturday", "Free Thursday evening"). Pure helpers + one
// client write. The planner reads effectiveSlots(): the usual week with the next two weeks' exceptions applied, then
// counted per slot (adapt.ts slotCounts), so no per-person value ever leaves the device.
import type { AvailabilityException, DayPart, ISODate, Slot, User } from "@/lib/types";
import { SLOTS } from "@/lib/types";

export const DAY_PARTS: DayPart[] = ["morning", "afternoon", "evening"];
export const PART_LABEL: Record<DayPart, string> = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };

/** Weekday of a calendar date (0 = Sunday), date-only so time zones never shift it. */
export function weekdayOf(date: ISODate): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** The planner slot a date + part falls in, or null (weekday mornings and afternoons are not planned). */
export function slotFor(date: ISODate, part: DayPart): Slot | null {
  const wd = weekdayOf(date);
  const key = wd === 6 ? `saturday-${part}` : wd === 0 ? `sunday-${part}` : part === "evening" ? "weekday-evening" : null;
  return key && (SLOTS as readonly string[]).includes(key) ? (key as Slot) : null;
}

/** Is this part of this date free in the usual week (before exceptions)? */
export function usuallyFree(user: Pick<User, "availability" | "blocked_days">, date: ISODate, part: DayPart): boolean {
  const slot = slotFor(date, part);
  if (!slot || !user.availability.includes(slot)) return false;
  return !user.blocked_days?.some((d) => slot.startsWith(d));
}

export function exceptionAt(user: Pick<User, "availability_exceptions">, date: ISODate, part: DayPart): AvailabilityException | undefined {
  return user.availability_exceptions?.find((e) => e.date === date && e.part === part);
}

/** Free or busy for this date and part, exceptions first. */
export function isFree(user: Pick<User, "availability" | "blocked_days" | "availability_exceptions">, date: ISODate, part: DayPart): boolean {
  const ex = exceptionAt(user, date, part);
  return ex ? ex.status === "free" : usuallyFree(user, date, part);
}

/**
 * The slots the planner should count for this person: the usual week, minus slots marked busy, plus slots marked
 * free, for exceptions dated today or later. A slot marked busy on one date and free on another stays in.
 */
export function effectiveSlots(user: Pick<User, "availability" | "blocked_days" | "availability_exceptions">, today?: ISODate): Slot[] {
  const base = new Set<Slot>(user.availability.filter((s) => !user.blocked_days?.some((d) => s.startsWith(d))));
  const live = (user.availability_exceptions ?? []).filter((e) => !today || e.date >= today);
  const busy = new Set<Slot>();
  const free = new Set<Slot>();
  for (const e of live) {
    const slot = slotFor(e.date, e.part);
    if (slot) (e.status === "busy" ? busy : free).add(slot);
  }
  for (const s of busy) if (!free.has(s)) base.delete(s);
  for (const s of free) base.add(s);
  return SLOTS.filter((s) => base.has(s));
}
