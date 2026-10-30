// [U2] Pure, isomorphic time helpers for the seed (no Date.now, no Intl, no client modules).
// America/Los_Angeles: PDT (-07:00) from the 2nd Sunday of March 02:00 local to the 1st Sunday of November 02:00 local.
import type { ISODateTime } from "@/lib/types";

const pad = (n: number) => String(n).padStart(2, "0");

function nthSunday(year: number, month0: number, n: number): number {
  const first = new Date(Date.UTC(year, month0, 1)).getUTCDay();
  return 1 + ((7 - first) % 7) + (n - 1) * 7;
}

/** UTC offset in hours (-7 or -8) for a UTC instant in Seattle. */
export function seattleOffsetHours(utcMs: number): -7 | -8 {
  const y = new Date(utcMs).getUTCFullYear();
  const startUtc = Date.UTC(y, 2, nthSunday(y, 2, 2), 10); // 02:00 PST = 10:00Z
  const endUtc = Date.UTC(y, 10, nthSunday(y, 10, 1), 9); // 02:00 PDT = 09:00Z
  return utcMs >= startUtc && utcMs < endUtc ? -7 : -8;
}

/** ISO string with the Seattle offset for an epoch-ms instant. */
export function seattleISO(ms: number): ISODateTime {
  const off = seattleOffsetHours(ms);
  const d = new Date(ms + off * 3600_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}${off === -7 ? "-07:00" : "-08:00"}`;
}

/** Local Seattle wall time -> ISO with the right offset. `date` = "2026-11-08", `hhmm` = "13:00". */
export function at(date: string, hhmm: string): ISODateTime {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  // Try PDT first, then verify.
  for (const off of [-7, -8] as const) {
    const utc = Date.UTC(y, m - 1, d, h - off, mi);
    if (seattleOffsetHours(utc) === off) return seattleISO(utc);
  }
  return seattleISO(Date.UTC(y, m - 1, d, h + 8, mi));
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
  return seattleISO(Date.parse(iso) + minutes * 60_000);
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const dayLabel = (date: string) => `${DAY[weekday(date)]}, ${MON[Number(date.slice(5, 7)) - 1]} ${Number(date.slice(8, 10))}`;
export function clock12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
}
