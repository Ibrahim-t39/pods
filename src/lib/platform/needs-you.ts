// The one count of "things that need you", shared by Home and the Inbox so the two never disagree.
// A thing = an open pod waiting on your answer (I'm in, the next-hangout vote, a check-in, meet again).
// Chat polls and new-pod offers are optional, so they are never counted.
import type { DbState } from "@/lib/types";
import { roomTables } from "@/components/pods/model";
import { tableNeedsYou } from "@/components/pods/home-model";

export function needsYouCount(db: DbState, nowMs: number): number {
  if (!db.me) return 0;
  return roomTables(db, nowMs).filter(tableNeedsYou).length;
}

/** "2 need you", "1 needs you", "You're all set". */
export function needsYouLine(n: number): string {
  return n === 0 ? "You're all set" : `${n} ${n === 1 ? "needs" : "need"} you`;
}

/** "A", "A and B", "A, B and C". */
export function listFormat(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
