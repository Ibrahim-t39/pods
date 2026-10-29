// Run it back: when the private "would you go again?" answers turn into a pod-level outcome. One rule, used by the
// reveal transaction (lib/db/local/hangouts), the crowd simulation, the card models and the pod table, so no surface
// can disagree about whether the pod is going again.
//   again  = Yes is at least max(floor, a majority of the people who answered)  -> show "3 of 4", plan #2
//   reveal = again, or every checked-in attendee has answered (then it is "Not this round" when not again)
// A number is only ever shown when the pod is going again (never a bare minority of yeses).

/** The smallest Yes count that ever turns into a number. */
export const RIB_FLOOR = 2;

export interface RibCounts {
  yes: number;
  answered: number;
  /** people who checked in to the hangout (the ballot is theirs) */
  checkedIn: number;
}

export type RibOutcome = "wait" | "again" | "not_this_round";

/** Yes is at least max(floor, majority of those who answered). 3 of 4 → true; 2 of 4 → false; 2 of 2 → true. */
export function ribAgain(yes: number, answered: number, floor = RIB_FLOOR): boolean {
  return answered > 0 && yes >= Math.max(floor, Math.floor(answered / 2) + 1);
}

/** Everyone who went has answered (a pod of one is not a pod outcome, so it takes at least two check-ins). */
export function ribAllAnswered(t: RibCounts): boolean {
  return t.checkedIn >= RIB_FLOOR && t.answered >= t.checkedIn;
}

/** What the pod sees now: still waiting, going again, or not this round. */
export function ribOutcome(t: RibCounts, floor = RIB_FLOOR): RibOutcome {
  if (ribAgain(t.yes, t.answered, floor)) return "again";
  return ribAllAnswered(t) ? "not_this_round" : "wait";
}

/** Reveal as soon as the outcome is known. */
export function ribShouldReveal(t: RibCounts, floor = RIB_FLOOR): boolean {
  return ribOutcome(t, floor) !== "wait";
}
