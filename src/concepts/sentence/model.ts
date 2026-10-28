// Sentence concept: pure helpers that turn store records into words.
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/time/tz";
import type { DbState, ID, Pod, PlannerStep } from "@/lib/types";

/** Pod names without city words: the app is about people, not the place (FOCUS rule). */
export function podWord(pod: Pod | undefined | null): string {
  if (!pod) return "";
  const cleaned = pod.name
    .replace(/\s*·\s*Huntsville/gi, "")
    .replace(/\b(Huntsville|Rocket City|Madison|Decatur|Alabama|AAMU)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const w = cleaned || pod.topic;
  return w.charAt(0).toUpperCase() + w.slice(1);
}

export const dayWord = (iso: string) => formatInTimeZone(iso, TZ, "EEEE");
export function hourWord(iso: string): string {
  const m = formatInTimeZone(iso, TZ, "mm");
  return formatInTimeZone(iso, TZ, m === "00" ? "h" : "h:mm") + formatInTimeZone(iso, TZ, "aaa").replace(/\./g, "");
}
export const hourShort = (iso: string) => {
  const m = formatInTimeZone(iso, TZ, "mm");
  return formatInTimeZone(iso, TZ, m === "00" ? "h" : "h:mm");
};
export const dateWord = (iso: string) => formatInTimeZone(iso, TZ, "MMM d").toLowerCase();
export function ordinalDay(iso: string): string {
  const d = Number(formatInTimeZone(iso, TZ, "d"));
  const s = d % 10 === 1 && d !== 11 ? "st" : d % 10 === 2 && d !== 12 ? "nd" : d % 10 === 3 && d !== 13 ? "rd" : "th";
  return `the ${d}${s}`;
}
export const spanWord = (a: string, b: string) => `${hourWord(a)}–${hourWord(b)}`;

export function names(db: DbState, ids: ID[]): string[] {
  return ids.map((id) => db.users[id]?.nickname || db.users[id]?.first_name || "someone");
}

/** "Amara, Dee and Theo" */
export function listWords(list: string[]): string {
  if (list.length <= 1) return list.join("");
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

export const stepDetail = (trace: PlannerStep[] | undefined, id: PlannerStep["id"]) => trace?.find((s) => s.id === id)?.detail ?? null;

/** The runner-up time from the trace ("Sunday afternoon (7 of 8) · Saturday morning (4)") for the proof strike. */
export function runnerUp(trace: PlannerStep[] | undefined): string | null {
  const d = stepDetail(trace, "time");
  if (!d) return null;
  const parts = d.split(/·|,|;/).map((s) => s.trim()).filter(Boolean);
  const second = parts[1];
  if (!second) return null;
  const m = /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekday|weeknight)s?/i.exec(second);
  return m ? m[0].replace(/^./, (c) => c.toUpperCase()) : null;
}

export function lower(s: string | null | undefined) {
  return (s ?? "").replace(/✓/g, "·").replace(/\s+/g, " ").trim().toLowerCase();
}
