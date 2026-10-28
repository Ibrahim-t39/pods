import { describe, expect, it } from "vitest";
import { momentOf } from "./moment";

describe("momentOf (the adaptive front)", () => {
  it("first run when you have no pods", () => {
    expect(momentOf({ statuses: [], held: 0, hour: 12 }).moment).toBe("first_run");
  });
  it("after a hangout, run it back takes over even with several pods", () => {
    const m = momentOf({ statuses: ["locked", "run_it_back"], podIds: ["a", "b"], held: 1, hour: 20 });
    expect(m).toMatchObject({ moment: "after", leadPodId: "b", light: "dusk", layout: "table", evening: true });
  });
  it("a plan waiting on I'm in leads, in the room when you have several pods", () => {
    const m = momentOf({ statuses: ["quiet", "needs_rsvp"], podIds: ["a", "b"], held: 0, hour: 9 });
    expect(m).toMatchObject({ moment: "deciding", leadPodId: "b", layout: "room", light: "dawn" });
  });
  it("one pod always opens on its table", () => {
    expect(momentOf({ statuses: ["locked"], podIds: ["a"], held: 3, hour: 9 })).toMatchObject({ moment: "locked", layout: "table", regular: true, light: "clear" });
  });
  it("the day of beats a pending plan elsewhere", () => {
    expect(momentOf({ statuses: ["needs_rsvp", "today"], podIds: ["a", "b"], held: 0, hour: 11 }).leadPodId).toBe("b");
  });
  it("quiet weeks surface the next fit", () => {
    expect(momentOf({ statuses: ["quiet", "quiet"], podIds: ["a", "b"], held: 4, hour: 15 })).toMatchObject({ moment: "quiet", layout: "room", light: "paper" });
  });
});
