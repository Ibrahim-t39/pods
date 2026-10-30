// Run it back reveal rule (sweep 10/29): majority of who answered, floor 2, or everyone answered.
import { describe, expect, it } from "vitest";
import type { Draft } from "immer";
import { produce } from "immer";
import { freshDb } from "@/lib/db/store";
import { revealRunItBack } from "@/lib/db/local/hangouts";
import type { DbState } from "@/lib/types";
import { ribAgain, ribOutcome, ribShouldReveal } from "./run-it-back";

describe("ribAgain / ribOutcome", () => {
  it("needs Yes from at least max(2, a majority of who answered)", () => {
    expect(ribAgain(3, 4)).toBe(true);
    expect(ribAgain(2, 4)).toBe(false);
    expect(ribAgain(2, 2)).toBe(true);
    expect(ribAgain(2, 3)).toBe(true);
    expect(ribAgain(1, 1)).toBe(false);
    expect(ribAgain(0, 0)).toBe(false);
  });
  it("waits, then says not this round once everyone answered without a majority", () => {
    expect(ribOutcome({ yes: 1, answered: 2, checkedIn: 4 })).toBe("wait");
    expect(ribOutcome({ yes: 2, answered: 4, checkedIn: 4 })).toBe("not_this_round");
    expect(ribOutcome({ yes: 3, answered: 4, checkedIn: 4 })).toBe("again");
    expect(ribShouldReveal({ yes: 1, answered: 1, checkedIn: 1 })).toBe(false); // one person is not a pod outcome
  });
});

describe("revealRunItBack transaction", () => {
  function withHangout(answers: Record<string, "yes" | "not_sure" | "no">) {
    const base = freshDb("demo");
    const podId = Object.keys(base.pods)[0];
    return produce(base, (d: Draft<DbState>) => {
      d.hangouts.h1 = {
        id: "h1", pod_id: podId, title: "Pickup basketball", starts_at: "2026-11-07T10:00:00-06:00", ends_at: "2026-11-07T12:00:00-06:00",
        venue_id: Object.keys(d.venues)[0], plan_text: "", is_starter: true, suggestion_id: "s1", status: "done", sequence: 1,
      };
      for (const u of Object.keys(answers)) d.rsvps.push({ hangout_id: "h1", user_id: u, status: "going", checked_in: true, checked_in_at: "2026-11-07T12:10:00-06:00" });
      d.runItBack.h1 = { hangout_id: "h1", responses: {}, revealed_at: null };
      for (const [u, a] of Object.entries(answers)) d.runItBack.h1.responses[u] = a;
    });
  }
  it("a 4-person hangout with 3 yes and 1 not sure reveals 3 of 4", () => {
    const next = produce(withHangout({ a: "yes", b: "yes", c: "yes", d: "not_sure" }), (d) => {
      expect(revealRunItBack(d, "h1", "2026-11-07T12:30:00-06:00")).toBe(true);
    });
    expect(next.runItBack.h1.revealed_at).not.toBeNull();
    const pod = next.hangouts.h1.pod_id;
    expect(next.messages[pod].at(-1)?.text).toBe("3 of 4 want to run it back.");
  });
  it("2 yes of 4 reveals as not this round, with no number", () => {
    const next = produce(withHangout({ a: "yes", b: "yes", c: "no", d: "not_sure" }), (d) => {
      expect(revealRunItBack(d, "h1", "2026-11-07T12:30:00-06:00")).toBe(true);
    });
    const pod = next.hangouts.h1.pod_id;
    expect(next.messages[pod].at(-1)?.text).toBe("Not this round. The pod stays.");
  });
});
