// One way to name and date a plan, on every surface (Home, Pods, Plans, Inbox, People, Search, Chat, plan details).
//   title  "Saturday pickup" / "Sunday picnic": the weekday from the start time (never trusted from the text) + a short noun
//   when   "Sat 10am" within the next 7 days ("Today 10am", "Tomorrow 10am"), otherwise "Sun, Nov 15 · 1pm"
//   span   "10am–12pm", "1–3pm", "11:30am–1pm"   (lowercase am/pm, no ":00", no trailing period)
//   place  "Brahan Spring Park" (the venue's short name; "A public place" when none)
// Pure functions, Chicago time. Import from "@/components/planner/plan-display".
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/time/tz";

type Iso = string;
type Clock = Date | number;

const f = (iso: Iso, p: string) => formatInTimeZone(iso, TZ, p);
const dayKey = (t: Iso | number) => formatInTimeZone(t, TZ, "yyyy-MM-dd");
const daysUntil = (iso: Iso, now: Clock) =>
  Math.round(
    (Date.parse(`${dayKey(iso)}T00:00:00Z`) -
      Date.parse(`${dayKey(+now)}T00:00:00Z`)) /
      86_400_000,
  );

/** "10am", "10:30am" */
export function planTime(iso: Iso): string {
  return f(iso, "h:mmaaa").replace(":00", "");
}

/** "10am–12pm", "1–3pm" (one meridiem when both ends share it). */
export function planSpan(startISO: Iso, endISO?: Iso | null): string {
  if (!endISO) return planTime(startISO);
  const a = planTime(startISO);
  const b = planTime(endISO);
  return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -2)}–${b}` : `${a}–${b}`;
}

/** "Sat 10am" within the next 7 days (Today / Tomorrow for those), otherwise "Sun, Nov 15 · 1pm". Pass `end` for a span. */
export function planWhen(iso: Iso, now: Clock, end?: Iso | null): string {
  const d = daysUntil(iso, now);
  const t = end ? planSpan(iso, end) : planTime(iso);
  if (d === 0) return `Today ${t}`;
  if (d === 1) return `Tomorrow ${t}`;
  if (d > 1 && d < 7) return `${f(iso, "EEE")} ${t}`;
  return `${f(iso, "EEE, MMM d")} · ${t}`;
}

/** "Today" / "Tomorrow" / "In 3 days" / "" (past). */
export function planSoon(iso: Iso, now: Clock): string {
  const d = daysUntil(iso, now);
  return d < 0 ? "" : d === 0 ? "Today" : d === 1 ? "Tomorrow" : `In ${d} days`;
}

/** "Saturday" */
export const planWeekday = (iso: Iso) => f(iso, "EEEE");

const WEEKDAY = /^(sun|mon|tues|wednes|thurs|fri|satur)day('s)?\s+/i;

/** The activity as a short noun: "Saturday pickup at Brahan Spring Park" → "pickup",
 *  "Picnic and a slow loop around the park" → "picnic", "Pickup basketball, rotating 5-on-5" → "pickup basketball". */
export function planNoun(text: string): string {
  const n = text
    .trim()
    .replace(WEEKDAY, "")
    .replace(/\s+(at|in|by|near)\s+.*$/i, "")
    .replace(/[,.;:(].*$/, "")
    .replace(/\s+(and|then|with|or)\s+.*$/i, "")
    .trim();
  const words = n.split(/\s+/).filter(Boolean).slice(0, 3).join(" ");
  // lowercase a sentence-case noun ("Picnic" → "picnic") but keep names ("High Point") as written
  return /^[A-Z][a-z]/.test(words) && !/\s[A-Z]/.test(words)
    ? words.toLowerCase()
    : words;
}

/** "Saturday pickup", "Sunday picnic": the weekday from the start time + the short noun. */
export function planTitle(
  text: string | null | undefined,
  startISO: Iso | null | undefined,
  fallback = "hangout",
): string {
  const noun = planNoun(text ?? "") || fallback.toLowerCase();
  const title = startISO ? `${planWeekday(startISO)} ${noun}` : noun;
  return title.charAt(0).toUpperCase() + title.slice(1);
}

/** "Brahan Spring Park" */
export function planPlace(
  v: { name: string; short_name?: string | null } | null | undefined,
): string {
  return v ? v.short_name || v.name : "A public place";
}

export interface PlanDisplay {
  title: string;
  when: string;
  span: string;
  place: string;
}

/** Everything a row needs, from a plan-like object (a PlanItem, a hangout or a suggestion + its venue). */
export function planDisplay(
  p: {
    title?: string | null;
    summary?: string | null;
    starts_at: Iso;
    ends_at?: Iso | null;
    venue?: { name: string; short_name?: string | null } | null;
  },
  now: Clock,
): PlanDisplay {
  return {
    title: planTitle(p.title ?? p.summary, p.starts_at),
    when: planWhen(p.starts_at, now),
    span: planSpan(p.starts_at, p.ends_at),
    place: planPlace(p.venue),
  };
}
