// [U4] The pinned card's state machine (BLUEPRINT §8.1) as a pure view model over DbState + the demo clock.
// U7 can call `cardView` to pick a pod card status or to render its own CheckInCard in the "check_in" state.
import { lockMinFor } from "@/lib/planner/lock";
import { activeSuggestion, goingUserIds, hangoutForSuggestion, membership, podMembers } from "@/lib/db/selectors";
import type { DbState, Hangout, HangoutSuggestion, ID, NextHangoutVote, RunItBackAnswer, Venue } from "@/lib/types";

export type CardPhase =
  | "empty" // no plan yet ("Your pods are quiet")
  | "pending_review"
  | "proposed"
  | "in" // you're in, not locked yet
  | "vote" // 2-3 options
  | "locked"
  | "starting_soon"
  | "happening_now"
  | "check_in"
  | "missed" // you said you couldn't make it
  | "ballot"
  | "waiting_reveal"
  | "planning_next";

export interface CardView {
  phase: CardPhase;
  podId: ID;
  suggestion: HangoutSuggestion | null;
  hangout: Hangout | null;
  /** The hangout the repeat loop is about (check-in → ballot → reveal). */
  lastHangout: Hangout | null;
  targetId: ID | null;
  venue: Venue | null;
  going: ID[];
  size: number;
  threshold: number;
  imIn: boolean;
  imOut: boolean;
  locked: boolean;
  dismissed: boolean;
  vote: NextHangoutVote | null;
  options: HangoutSuggestion[];
  myVote: ID | null;
  myBallot: RunItBackAnswer | null;
  checkedIn: boolean;
  round: number;
  revealed: { yes: number; answered: number } | null;
}

const MIN = 60_000;

export function cardView(db: DbState, podId: ID, nowMs: number): CardView | null {
  const pod = db.pods[podId];
  if (!pod) return null;
  const me = db.me;
  const size = podMembers(db, podId).length;
  const mine = membership(db, podId);
  const s = activeSuggestion(db, podId) ?? null;
  const threshold = lockMinFor(db, s);
  const hangouts = Object.values(db.hangouts)
    .filter((h) => h.pod_id === podId && h.status !== "cancelled")
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const lastLocked = hangouts[hangouts.length - 1] ?? null;
  const vote = Object.values(db.votes).find((v) => v.pod_id === podId && v.status === "open") ?? null;
  const options = s
    ? Object.values(db.suggestions).filter((o) => o.pod_id === podId && o.round === s.round && o.status !== "replaced").sort((a, b) => a.option_index - b.option_index)
    : [];
  const hangout = s ? (hangoutForSuggestion(db, s.id) ?? null) : null;
  const targetId = s ? (hangout?.id ?? s.id) : null;
  const going = targetId ? goingUserIds(db, targetId) : [];
  const myR = targetId && me ? db.rsvps.find((r) => r.hangout_id === targetId && r.user_id === me) : undefined;
  const base: CardView = {
    phase: "empty", podId, suggestion: s, hangout, lastHangout: lastLocked, targetId, venue: s ? (db.venues[s.venue_id] ?? null) : null,
    going, size, threshold, imIn: myR?.status === "going", imOut: myR?.status === "not_going", locked: !!hangout,
    dismissed: !!mine?.card_dismissed && !!s && mine.card_dismissed_for === s.id,
    vote, options, myVote: vote && me ? (vote.votes[me] ?? null) : null, myBallot: null, checkedIn: false, round: s?.round ?? 1, revealed: null,
  };

  // The repeat loop runs on the most recent hangout once it has ended, until a newer round exists.
  const loopOn = lastLocked && (!s || s.round <= lastLocked.sequence) && nowMs >= Date.parse(lastLocked.ends_at) + 15 * MIN;
  if (lastLocked && loopOn) {
    const r = me ? db.rsvps.find((x) => x.hangout_id === lastLocked.id && x.user_id === me) : undefined;
    const rib = db.runItBack[lastLocked.id];
    const answers = Object.values(rib?.responses ?? {});
    const yes = answers.filter((a) => a === "yes").length;
    const v: CardView = {
      ...base, lastHangout: lastLocked, hangout: lastLocked, checkedIn: !!r?.checked_in, myBallot: me ? (rib?.responses[me] ?? null) : null,
      revealed: rib?.revealed_at ? { yes, answered: answers.length } : null, locked: true, round: lastLocked.sequence,
      going: goingUserIds(db, lastLocked.id), targetId: lastLocked.id, venue: db.venues[lastLocked.venue_id] ?? null,
    };
    if (rib?.revealed_at) return { ...v, phase: "planning_next" };
    if (r?.status === "not_going" && !r.checked_in) return { ...v, phase: "missed" };
    if (!r?.checked_in) return { ...v, phase: "check_in" };
    if (!v.myBallot) return { ...v, phase: "ballot" };
    return { ...v, phase: "waiting_reveal" };
  }

  if (!s) return base;
  if (s.status === "pending_review") return { ...base, phase: "pending_review" };
  if (vote && options.length > 1 && !hangout) return { ...base, phase: "vote" };
  if (hangout) {
    const start = Date.parse(hangout.starts_at);
    const end = Date.parse(hangout.ends_at);
    if (nowMs >= start && nowMs < end + 15 * MIN) return { ...base, phase: "happening_now" };
    if (nowMs >= start - 30 * MIN && nowMs < start) return { ...base, phase: "starting_soon" };
    return { ...base, phase: "locked" };
  }
  return { ...base, phase: base.imIn ? "in" : "proposed" };
}

/** Labels for vote options (BLUEPRINT §0: "Same time in 2 weeks", "Weeknight run", Claude's option 3). */
export function optionLabel(o: HangoutSuggestion, podTopic: string): string {
  if (o.round >= 2 && o.option_index === 0) return "Same time in 2 weeks";
  if (o.round >= 2 && o.option_index === 1) return podTopic === "basketball" ? "Weeknight run" : "Weeknight meetup";
  return o.summary.replace(/^(Sunday|Saturday|Monday|Tuesday|Wednesday|Thursday|Friday)\s+/i, (m) => (o.option_index === 0 ? m : "")).replace(/^./, (c) => c.toUpperCase());
}

export const hangoutOrdinal = (n: number) => (n === 1 ? "First hangout" : n === 2 ? "Hangout #2" : `Hangout #${n}`);
