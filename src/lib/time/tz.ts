// [U3] America/Los_Angeles helpers. Pure (no store, no Date.now). Every stored timestamp is ISO 8601 WITH an offset; every
// display is Seattle. DST ends Sun Nov 1, 2026 (Oct 31 = -07:00, Nov 7 = -08:00), so never add 24h*n to move by days.
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { ISODateTime } from "@/lib/types";

export const TZ = "America/Los_Angeles";
export type TimeInput = number | Date | string;

const MS_DAY = 86_400_000;

/** ISO with the Seattle offset, e.g. "2026-11-04T09:00:00-08:00". */
export function toSeattleISO(t: TimeInput): ISODateTime {
  return formatInTimeZone(t, TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

/** "2026-11-08" for the Seattle calendar day containing `t`. */
export function seattleDayKey(t: TimeInput): string {
  return formatInTimeZone(t, TZ, "yyyy-MM-dd");
}

/** Minutes east of UTC at `t` in Seattle: -420 (PDT) or -480 (PST). */
export function seattleOffsetMinutes(t: TimeInput): number {
  const s = formatInTimeZone(t, TZ, "xxx"); // "-07:00"
  const sign = s.startsWith("-") ? -1 : 1;
  const [h, m] = s.slice(1).split(":").map(Number);
  return sign * (h * 60 + m);
}

export function isDstAt(t: TimeInput): boolean {
  return seattleOffsetMinutes(t) === -420;
}

/** Build an ISO from Seattle wall-clock parts (month 1-12). Nonexistent spring-forward times resolve forward. */
export function seattleWall(y: number, mo: number, d: number, h = 0, mi = 0, s = 0): ISODateTime {
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  let ms = fromZonedTime(`${p(y, 4)}-${p(mo)}-${p(d)}T${p(h)}:${p(mi)}:${p(s)}`, TZ).getTime();
  // A wall time inside the spring-forward gap does not exist; the lib lands an hour early, so nudge it forward.
  if (Number(formatInTimeZone(ms, TZ, "H")) !== h) ms += 3_600_000;
  return toSeattleISO(ms);
}

function parts(t: TimeInput) {
  const [y, mo, d, h, mi, s] = formatInTimeZone(t, TZ, "yyyy-M-d-H-m-s").split("-").map(Number);
  return { y, mo, d, h, mi, s };
}

/** Midnight (Seattle) at the start of the day containing `t`. */
export function startOfSeattleDay(t: TimeInput): ISODateTime {
  const { y, mo, d } = parts(t);
  return seattleWall(y, mo, d);
}

/** Same Seattle wall-clock time, `n` calendar days later (DST-safe; n may be negative). */
export function addSeattleDays(t: TimeInput, n: number): ISODateTime {
  const { y, mo, d, h, mi, s } = parts(t);
  const shifted = new Date(Date.UTC(y, mo - 1, d + n)); // calendar arithmetic only
  return seattleWall(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate(), h, mi, s);
}

/** Calendar days from a's Seattle day to b's Seattle day (positive when b is later). */
export function seattleDaysBetween(a: TimeInput, b: TimeInput): number {
  return Math.round((Date.parse(seattleDayKey(b)) - Date.parse(seattleDayKey(a))) / MS_DAY);
}

export function isSameSeattleDay(a: TimeInput, b: TimeInput): boolean {
  return seattleDayKey(a) === seattleDayKey(b);
}

/** 0 = Sunday ... 6 = Saturday, in Seattle. */
export function seattleWeekday(t: TimeInput): number {
  return Number(formatInTimeZone(t, TZ, "i")) % 7; // ISO 1-7 (Mon-Sun) -> 0-6 (Sun-Sat)
}
