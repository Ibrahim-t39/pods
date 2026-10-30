// [U3] America/Chicago helpers. Pure (no store, no Date.now). Every stored timestamp is ISO 8601 WITH an offset; every
// display is Chicago. DST ends Sun Nov 1, 2026 (Oct 31 = -05:00, Nov 7 = -06:00), so never add 24h*n to move by days.
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { ISODateTime } from "@/lib/types";

export const TZ = "America/Chicago";
export type TimeInput = number | Date | string;

const MS_DAY = 86_400_000;

/** ISO with the Chicago offset, e.g. "2026-11-04T09:00:00-06:00". */
export function toChicagoISO(t: TimeInput): ISODateTime {
  return formatInTimeZone(t, TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

/** "2026-11-08" for the Chicago calendar day containing `t`. */
export function chicagoDayKey(t: TimeInput): string {
  return formatInTimeZone(t, TZ, "yyyy-MM-dd");
}

/** Minutes east of UTC at `t` in Chicago: -300 (CDT) or -360 (CST). */
export function chicagoOffsetMinutes(t: TimeInput): number {
  const s = formatInTimeZone(t, TZ, "xxx"); // "-05:00"
  const sign = s.startsWith("-") ? -1 : 1;
  const [h, m] = s.slice(1).split(":").map(Number);
  return sign * (h * 60 + m);
}

export function isDstAt(t: TimeInput): boolean {
  return chicagoOffsetMinutes(t) === -300;
}

/** Build an ISO from Chicago wall-clock parts (month 1-12). Nonexistent spring-forward times resolve forward. */
export function chicagoWall(y: number, mo: number, d: number, h = 0, mi = 0, s = 0): ISODateTime {
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  let ms = fromZonedTime(`${p(y, 4)}-${p(mo)}-${p(d)}T${p(h)}:${p(mi)}:${p(s)}`, TZ).getTime();
  // A wall time inside the spring-forward gap does not exist; the lib lands an hour early, so nudge it forward.
  if (Number(formatInTimeZone(ms, TZ, "H")) !== h) ms += 3_600_000;
  return toChicagoISO(ms);
}

function parts(t: TimeInput) {
  const [y, mo, d, h, mi, s] = formatInTimeZone(t, TZ, "yyyy-M-d-H-m-s").split("-").map(Number);
  return { y, mo, d, h, mi, s };
}

/** Midnight (Chicago) at the start of the day containing `t`. */
export function startOfChicagoDay(t: TimeInput): ISODateTime {
  const { y, mo, d } = parts(t);
  return chicagoWall(y, mo, d);
}

/** Same Chicago wall-clock time, `n` calendar days later (DST-safe; n may be negative). */
export function addChicagoDays(t: TimeInput, n: number): ISODateTime {
  const { y, mo, d, h, mi, s } = parts(t);
  const shifted = new Date(Date.UTC(y, mo - 1, d + n)); // calendar arithmetic only
  return chicagoWall(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate(), h, mi, s);
}

/** Calendar days from a's Chicago day to b's Chicago day (positive when b is later). */
export function chicagoDaysBetween(a: TimeInput, b: TimeInput): number {
  return Math.round((Date.parse(chicagoDayKey(b)) - Date.parse(chicagoDayKey(a))) / MS_DAY);
}

export function isSameChicagoDay(a: TimeInput, b: TimeInput): boolean {
  return chicagoDayKey(a) === chicagoDayKey(b);
}

/** 0 = Sunday ... 6 = Saturday, in Chicago. */
export function chicagoWeekday(t: TimeInput): number {
  return Number(formatInTimeZone(t, TZ, "i")) % 7; // ISO 1-7 (Mon-Sun) -> 0-6 (Sun-Sat)
}
