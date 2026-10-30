// Home's pure decisions (sweep 10/29), kept out of the component so they can be tested:
//   upNext      what leads "Up next": the repeat loop when it is live, else the soonest hangout whatever its state
//   weekGlance  "1 plan · Sat": hangouts that have not ended and start within 7 days (never vote deadlines)
//   greeting    "Good morning" … "Hi" at night
//   inLine      "Malik, Ama and Tobi are in" (the text label for an avatar stack)
import { formatInTimeZone } from "date-fns-tz";
import type { CalItem } from "@/lib/platform/calendar";
import { seattleDaysBetween, TZ } from "@/lib/time/tz";
import type { PodStatus, RoomTable } from "./model";

const DAY = 86_400_000;

/** States that take the front over any plan: the hangout is on now, or just happened and wants an answer. */
const URGENT: PodStatus[] = ["happening_now", "checkin_due", "run_it_back"];
/** Pod states that wait on you. */
const NEEDS: PodStatus[] = ["needs_rsvp", "vote_open", "checkin_due", "run_it_back"];

export function tableNeedsYou(t: RoomTable): boolean {
  return t.open && NEEDS.includes(t.row.status);
}

/** A plan that is still ahead (or on now) and has a real time. */
function upcomingStart(t: RoomTable, nowMs: number): number | null {
  const p = t.row.plan;
  if (!t.open || !p || p.s.status === "pending_review" || p.cantMake) return null;
  return Date.parse(p.endsAt) > nowMs ? Date.parse(p.startsAt) : null;
}

/**
 * The lead of "Up next" and the quieter rows under it.
 *   1. a hangout happening now, or one that just ended and wants a check-in / run-it-back answer
 *   2. else the soonest upcoming hangout, whatever its state (needs you, you're in, locked), so a plan stays on top
 *      after you say I'm in and after it locks
 *   3. else the pod the moment picks (a vote, the AI planning), else the first open pod
 * The rest: every other open pod that waits on you.
 */
export function upNext(tables: RoomTable[], nowMs: number, fallbackId?: string | null): { lead: RoomTable | undefined; rest: RoomTable[] } {
  const open = tables.filter((t) => t.open);
  const urgent = open.filter((t) => URGENT.includes(t.row.status)).sort((a, b) => URGENT.indexOf(a.row.status) - URGENT.indexOf(b.row.status))[0];
  const soonest = open
    .map((t) => ({ t, at: upcomingStart(t, nowMs) }))
    .filter((x): x is { t: RoomTable; at: number } => x.at != null)
    .sort((a, b) => a.at - b.at)[0]?.t;
  const lead = urgent ?? soonest ?? open.find((t) => t.row.pod.id === fallbackId) ?? open[0];
  return { lead, rest: open.filter((t) => t !== lead && tableNeedsYou(t)) };
}

/** "Today", "Tomorrow", "Sat" within the next 6 days, else "Sun, Nov 15". Seattle calendar days. */
export function planDay(iso: string, nowMs: number): string {
  const days = seattleDaysBetween(nowMs, iso);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1 && days <= 6) return formatInTimeZone(iso, TZ, "EEE");
  return formatInTimeZone(iso, TZ, "EEE, MMM d");
}

/** "Sat 10am", "Today 7pm", "Tomorrow 10am"; further out "Sun, Nov 15 · 1pm". */
export function planWhen(iso: string, nowMs: number): string {
  const time = formatInTimeZone(iso, TZ, "h:mmaaa").replace(":00", "");
  const days = seattleDaysBetween(nowMs, iso);
  return `${planDay(iso, nowMs)}${days >= 0 && days <= 6 ? " " : " · "}${time}`;
}

/** Home's week line: the hangouts ahead in the next 7 days. Votes, check-ins and finished hangouts don't count. */
export function weekGlance(items: CalItem[], nowMs: number): { count: number; line: string; next: CalItem | null } {
  const ahead = items
    .filter((i) => (i.kind === "plan" || i.kind === "hangout") && Date.parse(i.ends_at) > nowMs && Date.parse(i.starts_at) < nowMs + 7 * DAY)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const next = ahead[0] ?? null;
  if (!next) return { count: 0, line: "Nothing else this week", next: null };
  return { count: ahead.length, line: `${ahead.length} ${ahead.length === 1 ? "plan" : "plans"} · ${planDay(next.starts_at, nowMs)}`, next };
}

/** Greeting by the local hour: night (0-5) is a plain "Hi". */
export function greeting(hour: number): string {
  if (hour < 5) return "Hi";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** "Malik is in", "Malik and Ama are in", "Malik, Ama and Tobi are in", "Malik, Ama, Tobi and 2 more are in". You first as "You". */
export function inLine(names: string[], max = 3): string {
  const n = names.filter(Boolean);
  if (!n.length) return "Nobody is in yet";
  const shown = n.slice(0, max);
  const extra = n.length - shown.length;
  const parts = extra > 0 ? [...shown, `${extra} more`] : shown;
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return `${list} ${parts.length === 1 && n.length === 1 && n[0] !== "You" ? "is" : "are"} in`;
}
