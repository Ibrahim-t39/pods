// [U3] Seattle-time formatting. Copy is plain and sentence case. Everything displays in America/Los_Angeles.
import { formatInTimeZone } from "date-fns-tz";
import { seattleDayKey, seattleDaysBetween, TZ, type TimeInput } from "./tz";

const f = (t: TimeInput, pattern: string) => formatInTimeZone(t, TZ, pattern);

/** "1:00 PM" */
export function formatTime(t: TimeInput): string {
  return f(t, "h:mm a");
}

/** "Nov 8" */
export function formatShortDate(t: TimeInput): string {
  return f(t, "MMM d");
}

/** "Sun, Nov 8 · 1:00 PM" */
export function formatWhen(t: TimeInput): string {
  return `${f(t, "EEE, MMM d")} · ${f(t, "h:mm a")}`;
}

/** "1:00-3:00 PM", or "11:30 AM-1:00 PM" when the meridiem changes. */
export function formatSpan(startISO: string, endISO: string): string {
  const sm = f(startISO, "a");
  const em = f(endISO, "a");
  return sm === em ? `${f(startISO, "h:mm")}-${f(endISO, "h:mm a")}` : `${f(startISO, "h:mm a")}-${f(endISO, "h:mm a")}`;
}

/** "Sunday, Nov 1" */
export function formatDay(t: TimeInput): string {
  return f(t, "EEEE, MMM d");
}

/** "Sunday" */
export function formatWeekday(t: TimeInput): string {
  return f(t, "EEEE");
}

/** Pod cards: "Sun 1:00 PM" within the next 6 days, otherwise "Sun, Nov 15 · 1:00 PM". */
export function formatCardWhen(t: TimeInput, now: Date): string {
  const days = seattleDaysBetween(now, t);
  return days >= 0 && days <= 6 ? `${f(t, "EEE")} ${f(t, "h:mm a")}` : formatWhen(t);
}

/** Chat day divider: "Today", "Yesterday", "Sunday, Nov 1" (with the year when it is not this year). */
export function formatDayDivider(t: TimeInput, now: Date): string {
  const diff = seattleDaysBetween(t, now);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return f(t, f(t, "yyyy") === f(now, "yyyy") ? "EEEE, MMM d" : "EEEE, MMM d, yyyy");
}

/** "Just now", "5 min ago", "3 h ago", "Yesterday", "Sunday", or "Nov 1". Future times read "Just now". */
export function formatRelative(t: TimeInput, now: Date): string {
  const ms = now.getTime() - new Date(t).getTime();
  if (ms < 60_000) return "Just now";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min} min ago`;
  const days = seattleDaysBetween(t, now);
  if (days === 0) return `${Math.floor(min / 60)} h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return f(t, "EEEE");
  return f(t, f(t, "yyyy") === f(now, "yyyy") ? "MMM d" : "MMM d, yyyy");
}

/** "Pod started Nov 1, 2026" */
export function formatPodStarted(t: TimeInput): string {
  return `Pod started ${f(t, "MMM d, yyyy")}`;
}

/** "2 hours", "1 hour", "45 min", "1 h 30 min" */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (r === 0) return `${h} ${h === 1 ? "hour" : "hours"}`;
  return `${h} h ${r} min`;
}

/** "In 4 days" / "Tomorrow" / "Today" / "Happening now" / "Done", by Seattle calendar days. */
export function countdown(startISO: string, endISO: string, now: Date): string {
  const t = now.getTime();
  if (t >= Date.parse(endISO)) return "Done";
  if (t >= Date.parse(startISO)) return "Happening now";
  const days = seattleDaysBetween(now, startISO);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

/** "Starts in 2 h 15 min" style, for same-day check-in prompts. Empty once started. */
export function startsIn(startISO: string, now: Date): string {
  const min = Math.ceil((Date.parse(startISO) - now.getTime()) / 60_000);
  if (min <= 0) return "";
  if (seattleDayKey(startISO) !== seattleDayKey(now)) return countdown(startISO, startISO, now);
  return `Starts in ${formatDuration(min)}`;
}
