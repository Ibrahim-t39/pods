import { describe, expect, it } from "vitest";
import type { DbState } from "@/lib/types";
import { podColor, podTopicLabel, timeTogether, togetherLine, widenedLine } from "./model";

function db(checkedIn: boolean, otherCheckedIn = true): DbState {
  return {
    me: "me",
    hangouts: {
      h1: { id: "h1", pod_id: "hoopers", starts_at: "2026-11-07T10:00:00-08:00", ends_at: "2026-11-07T12:00:00-08:00", status: "done" },
      h2: { id: "h2", pod_id: "other", starts_at: "2026-11-08T10:00:00-08:00", ends_at: "2026-11-08T13:00:00-08:00", status: "done" },
    },
    rsvps: [
      { hangout_id: "h1", user_id: "me", status: "going", checked_in: checkedIn },
      { hangout_id: "h1", user_id: "tobi", status: "going", checked_in: otherCheckedIn },
    ],
    pods: {
      sa: { id: "sa", hue: "grove", type: "community", topic: "Southern African", widened_from: { kind: "group", from: "Zambian", to: "Southern African" } },
    },
    plannerCache: { "sa:widen_explainer": { output: { body: "Only 3 Zambians live nearby, so we widened to Southern African." } } },
  } as unknown as DbState;
}

describe("timeTogether", () => {
  it("is hidden before the first check-in", () => {
    expect(timeTogether(db(false), { podId: "hoopers" })).toBeNull();
    expect(togetherLine(timeTogether(db(false), { podId: "hoopers" }))).toBeNull();
  });
  it("counts checked-in hangouts for a pod", () => {
    expect(togetherLine(timeTogether(db(true), { podId: "hoopers" }))).toBe("1 hangout · 2 hours together");
  });
  it("counts hangouts both people checked in to for a person", () => {
    expect(timeTogether(db(true), { userId: "tobi" })).toEqual({ hangouts: 1, hours: 2 });
    expect(timeTogether(db(true, false), { userId: "tobi" })).toBeNull();
  });
  it("pluralises and keeps a half hour", () => {
    expect(togetherLine({ hangouts: 2, hours: 4.5 })).toBe("2 hangouts · 4.5 hours together");
    expect(togetherLine({ hangouts: 1, hours: 1 })).toBe("1 hangout · 1 hour together");
  });
});

describe("pod identity", () => {
  it("the pod owns its colour", () => {
    expect(podColor({ hue: "signal", type: "interest" })).toBe("signal");
    expect(podColor({ hue: "ember", type: "interest" })).toBe("ember");
  });
  it("labels the interest", () => {
    expect(podTopicLabel({ topic: "board games", type: "interest" })).toBe("Board games");
  });
  it("says the widened line once, plainly", () => {
    expect(widenedLine(db(true), "sa")).toBe("Only 3 Zambians nearby, so your pod is Southern African.");
    expect(widenedLine(db(true), "hoopers")).toBeNull();
  });
});
