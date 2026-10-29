import { describe, expect, it } from "vitest";
import { buildSeedPolls } from "@/data/polls";
import { isRsvpOption, openVoteOptions, pollClosed, threadOrder, TYPING_MAX_MS, typingVisible } from "./talk-logic";
import type { DbState } from "@/lib/types";

describe("threadOrder", () => {
  it("keeps insertion order on a timestamp tie (the @AI question stays after the earlier line)", () => {
    const rows = [
      { at: "2026-11-04T20:00:00-06:00", k: "tobi" },
      { at: "2026-11-04T20:00:00-06:00", k: "me" },
      { at: "2026-11-04T20:00:00-06:00", k: "ai" },
    ];
    expect(threadOrder(rows).map((r) => r.k)).toEqual(["tobi", "me", "ai"]);
  });
  it("orders by instant across DST offsets, not by string", () => {
    const rows = [
      { at: "2026-11-01T01:40:00-05:00", k: "first" }, // 06:40Z
      { at: "2026-11-01T01:10:00-06:00", k: "second" }, // 07:10Z, sorts first as a string
    ];
    expect(threadOrder([rows[1], rows[0]]).map((r) => r.k)).toEqual(["first", "second"]);
  });
});

describe("typingVisible", () => {
  it("hides at its own deadline and never sticks past the cap", () => {
    expect(typingVisible(null, 0, 0)).toBe(false);
    expect(typingVisible({ until: 2000 }, 0, 1000)).toBe(true);
    expect(typingVisible({ until: 2000 }, 0, 2000)).toBe(false);
    expect(typingVisible({ until: Number.MAX_SAFE_INTEGER }, 0, TYPING_MAX_MS)).toBe(false);
  });
});

describe("polls", () => {
  it("rejects an option that reads as the plan's RSVP", () => {
    for (const x of ["I'm in", "i'm in", "Im in", "I’m in!", "  I'm in  "]) expect(isRsvpOption(x)).toBe(true);
    for (const x of ["Tacos, yes", "Count me in", "I'm in for tacos"]) expect(isRsvpOption(x)).toBe(false);
  });
  it("seeded polls never offer 'I'm in', and the Tacos poll closes when Saturday's game ends", () => {
    const { polls } = buildSeedPolls();
    expect(polls.flatMap((p) => p.options.map((o) => o.label)).some(isRsvpOption)).toBe(false);
    const tacos = polls.find((p) => p.id === "poll_hoopers_tacos")!;
    expect(tacos.options.map((o) => o.label)).toEqual(["Tacos, yes", "Depends on the time", "Can't stay"]);
    expect(pollClosed(tacos, Date.parse("2026-11-07T11:59:00-06:00"))).toBe(false);
    expect(pollClosed(tacos, Date.parse("2026-11-07T12:00:00-06:00"))).toBe(true);
  });
  it("a closed status always wins", () => {
    expect(pollClosed({ status: "closed", closes_at: null }, 0)).toBe(true);
    expect(pollClosed({ status: "open", closes_at: null }, Number.MAX_SAFE_INTEGER)).toBe(false);
  });
});

describe("openVoteOptions", () => {
  it("lists only the open vote's options in this pod", () => {
    const db = {
      votes: {
        v1: { id: "v1", pod_id: "p", after_hangout_id: "h", option_ids: ["s1", "s2"], votes: {}, closes_at: "", status: "open", winner_id: null },
        v2: { id: "v2", pod_id: "p", after_hangout_id: "h", option_ids: ["s0"], votes: {}, closes_at: "", status: "closed", winner_id: "s0" },
        v3: { id: "v3", pod_id: "q", after_hangout_id: "h", option_ids: ["s9"], votes: {}, closes_at: "", status: "open", winner_id: null },
      },
    } as unknown as Pick<DbState, "votes">;
    expect(openVoteOptions(db, "p")).toEqual(["s1", "s2"]);
  });
});
