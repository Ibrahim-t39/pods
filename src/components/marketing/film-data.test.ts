import { describe, expect, it } from "vitest";
import { WEEKS, countWord, hoursLabel, lockLine } from "./film-data";
import { lockRule } from "@/lib/planner/lock";
import { compareOn } from "./landing-switch";

describe("film hangout cards", () => {
  it("are hangouts #1 to #8, the first one the 4 who locked it", () => {
    expect(WEEKS.map((w) => w.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(WEEKS[0].came).toBe(4);
  });
  it("add 2 to 4 hours per hangout and stay under ~50", () => {
    WEEKS.forEach((w, i) => {
      const step = w.hrs - (i ? WEEKS[i - 1].hrs : 0);
      expect(step).toBeGreaterThanOrEqual(2);
      expect(step).toBeLessThanOrEqual(4);
      expect(w.came).toBeLessThanOrEqual(8);
    });
    expect(WEEKS[7].hrs).toBeLessThan(50);
  });
  it("label hours against ~50", () => {
    expect(hoursLabel(21)).toBe("21 of ~50 hours together");
    expect(hoursLabel(50)).toBe("50 hours together");
  });
});

describe("/try lock line", () => {
  it("reads Hoopers' own number: locks at 4, three said yes", () => {
    const n = lockRule({ key: "basketball", size: 8 }).min_to_lock;
    expect(lockLine(n)).toEqual({ line: "It locks at 4.", sub: "Three said yes." });
  });
  it("follows other plans' numbers", () => {
    expect(lockLine(lockRule({ key: "guitar", size: 8 }).min_to_lock)).toEqual({ line: "It locks at 3.", sub: "Two said yes." });
    expect(lockLine(2).sub).toBe("One said yes.");
    expect(countWord(12)).toBe("12");
  });
});

describe("landing switch", () => {
  it("shows only with ?compare=1", () => {
    expect(compareOn("")).toBe(false);
    expect(compareOn("?compare=0")).toBe(false);
    expect(compareOn("?compare=1")).toBe(true);
    expect(compareOn("?x=2&compare=1")).toBe(true);
  });
});
