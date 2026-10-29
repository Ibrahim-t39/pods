// One line per pod on the profile ("4 people · Locked Sat, Nov 7 · 10am"). Pure: reads the db, never writes.
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/time/tz";
import type { DbState, ID } from "@/lib/types";
import type { PlanItem } from "@/lib/platform/selectors";

/** "Sat, Nov 7 · 10am" (times are labels, never "10:00 AM"). */
export function shortWhen(iso: string): string {
  return `${formatInTimeZone(iso, TZ, "EEE, MMM d")} · ${formatInTimeZone(iso, TZ, "h:mmaaa").replace(":00", "")}`;
}

/** The hangout number a pod is voting on (2 for "Voting on #2"), or null when no vote is open. */
export function votingOn(db: DbState, podId: ID, upcoming: PlanItem[], nowMs: number): number | null {
  const vote = Object.values(db.votes ?? {}).find((v) => v.pod_id === podId && v.status === "open" && Date.parse(v.closes_at) > nowMs);
  const options = upcoming.filter((p) => p.podId === podId && p.kind === "plan").length;
  if (!vote && options < 2) return null;
  const after = vote ? db.hangouts[vote.after_hangout_id] : undefined;
  if (after?.sequence) return after.sequence + 1;
  const held = Object.values(db.hangouts).filter((h) => h.pod_id === podId && h.status !== "cancelled").length;
  return held + 1;
}

/** "Voting on #2" · "Locked Sat, Nov 7 · 10am" · "Next Sat, Nov 7 · 10am" · "Planning the first one" (or "the next one") */
export function podNextLine(db: DbState, podId: ID, upcoming: PlanItem[], nowMs: number): string {
  const n = votingOn(db, podId, upcoming, nowMs);
  if (n) return `Voting on #${n}`;
  const next = upcoming.find((p) => p.podId === podId);
  if (!next) {
    const held = Object.values(db.hangouts).some((h) => h.pod_id === podId && h.status !== "cancelled" && Date.parse(h.ends_at) <= nowMs);
    return held ? "Planning the next one" : "Planning the first one";
  }
  return `${next.locked ? "Locked" : "Next"} ${shortWhen(next.starts_at)}`;
}
