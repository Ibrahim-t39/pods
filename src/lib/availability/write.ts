// Client write for availability exceptions (kept apart so the planner's pure helpers never import the store).
import { useStore } from "@/lib/db/store";
import type { DayPart, ISODate } from "@/lib/types";
import { usuallyFree } from "./exceptions";

/**
 * Client write: set this date + part to busy or free, or clear it (null) back to the usual week. A mark that equals
 * the usual week is stored as a clear. Past dates are pruned on every write.
 */
export function setException(date: ISODate, part: DayPart, status: "busy" | "free" | null, today: ISODate): void {
  useStore.getState().commit((d) => {
    const me = d.me ? d.users[d.me] : undefined;
    if (!me) return;
    const rest = (me.availability_exceptions ?? []).filter((e) => e.date >= today && !(e.date === date && e.part === part));
    const usual = usuallyFree(me, date, part);
    if (status && (status === "free") !== usual) rest.push({ date, part, status });
    me.availability_exceptions = rest.sort((a, b) => a.date.localeCompare(b.date));
  });
}
