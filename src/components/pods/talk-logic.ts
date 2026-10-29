// Talk's pure rules (tested in talk-logic.test.ts): thread order, the typing timeout, poll rules, round-two cards.
import type { DbState } from "@/lib/types";

/** The suggestions on an open round-two vote in this pod: their plan cards wait until one locks. */
export function openVoteOptions(db: Pick<DbState, "votes">, podId: string): string[] {
  return Object.values(db.votes).filter((v) => v.pod_id === podId && v.status === "open").flatMap((v) => v.option_ids);
}

/** Thread order: by instant (offsets differ across DST, so never by string), then by insertion order on a tie. */
export function threadOrder<T extends { at: string }>(rows: T[]): T[] {
  return rows
    .map((r, i) => ({ r, i, t: Date.parse(r.at) }))
    .sort((a, b) => a.t - b.t || a.i - b.i)
    .map((x) => x.r);
}

/** A simulated "is typing" never sticks: it shows until its own deadline, and never for more than TYPING_MAX_MS. */
export const TYPING_MAX_MS = 4500;
export function typingVisible(t: { until: number } | null, seenAt: number, nowMs: number): boolean {
  return !!t && nowMs < Math.min(t.until, seenAt + TYPING_MAX_MS);
}
/** A poll option that reads as the plan's RSVP ("I'm in", "im in") is not allowed. */
export function isRsvpOption(label: string): boolean {
  return /^i['’]?m in[.!]?$/i.test(label.trim());
}

/** A poll is closed when someone closed it or when its hangout has ended (closes_at). */
export function pollClosed(poll: { status: string; closes_at: string | null }, nowMs: number): boolean {
  return poll.status !== "open" || (!!poll.closes_at && nowMs >= Date.parse(poll.closes_at));
}

