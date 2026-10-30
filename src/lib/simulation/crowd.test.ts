// Crowd RSVPs (sweep 10/29): bots count only bots, so a plan you tapped first still reaches its lock.
import { describe, expect, it } from "vitest";
import { produce } from "immer";
import { freshDb } from "@/lib/db/store";
import { applyRsvp } from "@/lib/db/local/hangouts";
import { lockMinFor } from "@/lib/planner/lock";
import type { DbState, HangoutSuggestion } from "@/lib/types";
import { crowdRsvpNeed, isSeedId } from "./crowd";

function withPlan(): { db: DbState; me: string; bots: string[]; s: HangoutSuggestion } {
  const base = freshDb("demo");
  const podId = "pod_hoopers";
  const seed = base.suggestions.sug_hoopers_1;
  const bots = base.memberships.filter((m) => m.pod_id === podId && base.users[m.user_id]?.is_demo_bot).map((m) => m.user_id);
  const me = bots.pop()!; // stands in for the signed-in person
  const db = produce(base, (d) => {
    d.users[me].is_demo_bot = false;
    d.me = me;
    d.suggestions.sug_X1 = { ...seed, id: "sug_X1", status: "suggested", round: 1, option_index: 0, min_to_lock: 4 };
    d.suggestions.sug_hoopers_1.status = "replaced";
  });
  return { db, me, bots, s: db.suggestions.sug_X1 };
}

describe("crowdRsvpNeed", () => {
  it("ignores your own tap, and the last bot locks the plan", () => {
    let { db, me, bots, s } = withPlan();
    expect(lockMinFor(db, s)).toBe(4);
    db = produce(db, (d) => void applyRsvp(d, s.id, me, "going", "2026-11-04T09:00:00-06:00"));
    expect(crowdRsvpNeed(db, s.id)).toBe(3);
    for (const b of bots.slice(0, 3)) db = produce(db, (d) => void applyRsvp(d, s.id, b, "going", "2026-11-04T09:01:00-06:00"));
    expect(db.suggestions.sug_X1.status).toBe("accepted");
  });
  it("without your tap, bots stop one short", () => {
    let { db, bots, s } = withPlan();
    for (const b of bots.slice(0, crowdRsvpNeed(db, s.id))) db = produce(db, (d) => void applyRsvp(d, s.id, b, "going", "2026-11-04T09:01:00-06:00"));
    expect(db.suggestions.sug_X1.status).toBe("suggested");
    expect(crowdRsvpNeed(db, s.id)).toBe(0);
  });
  it("tells seed rows from runtime rows", () => {
    expect(isSeedId("sug_hoopers_1")).toBe(true);
    expect(isSeedId("sug_V1StGXR8Z5jdHi6B")).toBe(false);
  });
});
