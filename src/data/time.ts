// [U2] Pure, isomorphic time helpers for the seed (no Date.now, no Intl, no client modules).
// America/Chicago: CDT (-05:00) from the 2nd Sunday of March 02:00 local to the 1st Sunday of November 02:00 local.
import type { ISODateTime } from "@/lib/types";

const pad = (n: number) => String(n).padStart(2, "0");

function nthSunday(year: number, month0: number, n: number): number {
  const first = new Date(Date.UTC(year, month0, 1)).getUTCDay();
  return 1 + ((7 - first) % 7) + (n - 1) * 7;
}

/** UTC offset in hours (-5 or -6) for a UTC instant in Chicago. */
export function chicagoOffsetHours(utcMs: number): -5 | -6 {
  const y = new Date(utcMs).getUTCFullYear();
  const startUtc = Date.UTC(y, 2, nthSunday(y, 2, 2), 8); // 02:00 CST = 08:00Z
  const endUtc = Date.UTC(y, 10, nthSunday(y, 10, 1), 7); // 02:00 CDT = 07:00Z
  return utcMs >= startUtc && utcMs < endUtc ? -5 : -6;
}

/** ISO string with the Chicago offset for an epoch-ms instant. */
export function chicagoISO(ms: number): ISODateTime {
  const off = chicagoOffsetHours(ms);
  const d = new Date(ms + off * 3600_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}${off === -5 ? "-05:00" : "-06:00"}`;
}

/** Local Chicago wall time -> ISO with the right offset. `date` = "2026-11-08", `hhmm` = "13:00". */
export function at(date: string, hhmm: string): ISODateTime {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  // Try CDT first, then verify.
  for (const off of [-5, -6] as const) {
    const utc = Date.UTC(y, m - 1, d, h - off, mi);
    if (chicagoOffsetHours(utc) === off) return chicagoISO(utc);
  }
  return chicagoISO(Date.UTC(y, m - 1, d, h + 6, mi));
}

/** Add whole days to a "YYYY-MM-DD" date. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Local calendar date of an ISO string that carries an offset (reads the written wall clock). */
export const dateOf = (iso: string) => iso.slice(0, 10);
export const timeOf = (iso: string) => iso.slice(11, 16);

/** 0 = Sunday ... 6 = Saturday for a "YYYY-MM-DD". */
export function weekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Next date on/after `from` with the given weekday (0 = Sun). */
export function nextWeekday(from: string, wd: number): string {
  return addDays(from, (wd - weekday(from) + 7) % 7);
}

export function addMinutes(iso: string, minutes: number): ISODateTime {
  return chicagoISO(Date.parse(iso) + minutes * 60_000);
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const dayLabel = (date: string) => `${DAY[weekday(date)]}, ${MON[Number(date.slice(5, 7)) - 1]} ${Number(date.slice(8, 10))}`;
export function clock12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
}
