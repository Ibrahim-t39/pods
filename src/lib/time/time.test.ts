// [U3] Clock + Chicago time tests, including the Nov 1, 2026 DST end.
import { describe, expect, it } from "vitest";
import { DEMO } from "@/config";
import { jumpedClock, virtualNowMs } from "./clock-core";
import {
  countdown, formatCardWhen, formatDay, formatDayDivider, formatDuration, formatPodStarted, formatRelative, formatSpan,
  formatTime, formatWhen,
} from "./format";
import {
  addChicagoDays, chicagoDaysBetween, chicagoOffsetMinutes, chicagoWall, chicagoWeekday, isDstAt, startOfChicagoDay,
  toChicagoISO,
} from "./tz";

describe("clock arithmetic", () => {
  const anchor = Date.parse(DEMO.anchor!);
  it("is exactly the virtual time before hydration / on the server", () => {
    expect(virtualNowMs({ virtual_at: DEMO.anchor!, real_at: 5 }, false, 99999)).toBe(anchor);
    expect(virtualNowMs({ virtual_at: DEMO.anchor!, real_at: 5 }, true, null)).toBe(anchor);
    expect(virtualNowMs({ virtual_at: DEMO.anchor!, real_at: 0 }, true, 99999)).toBe(anchor);
  });
  it("advances with real time after boot", () => {
    expect(virtualNowMs({ virtual_at: DEMO.anchor!, real_at: 1000 }, true, 1000 + 90_000)).toBe(anchor + 90_000);
  });
  it("never runs backwards on skew", () => {
    expect(virtualNowMs({ virtual_at: DEMO.anchor!, real_at: 5000 }, true, 1000)).toBe(anchor);
  });
  it("anchor is Wed Nov 4 09:00 CT and the Director jump is Sat Nov 7 12:15 PM", () => {
    expect(toChicagoISO(anchor)).toBe("2026-11-04T09:00:00-06:00");
    const j = jumpedClock(DEMO.directorJump.at, 42);
    expect(j).toEqual({ virtual_at: "2026-11-07T12:15:00-06:00", real_at: 42 });
    expect(toChicagoISO(virtualNowMs(j, true, 42 + 60_000))).toBe("2026-11-07T12:16:00-06:00");
    expect(chicagoWeekday(DEMO.directorJump.at)).toBe(6);
    expect(chicagoWeekday(anchor)).toBe(3);
  });
  it("rejects a bad jump", () => {
    expect(() => jumpedClock("nope", 1)).toThrow();
  });
});

describe("DST (ends Sun Nov 1, 2026)", () => {
  it("Oct 31 is -05:00 and Nov 7 is -06:00", () => {
    expect(toChicagoISO("2026-10-31T18:00:00Z")).toBe("2026-10-31T13:00:00-05:00");
    expect(toChicagoISO("2026-11-07T19:00:00Z")).toBe("2026-11-07T13:00:00-06:00");
    expect(chicagoOffsetMinutes("2026-10-31T12:00:00Z")).toBe(-300);
    expect(chicagoOffsetMinutes("2026-11-07T12:00:00Z")).toBe(-360);
    expect(isDstAt("2026-10-31T12:00:00Z")).toBe(true);
    expect(isDstAt("2026-11-01T12:00:00Z")).toBe(false);
  });
  it("wall-clock construction picks the right offset either side", () => {
    expect(chicagoWall(2026, 10, 31, 13)).toBe("2026-10-31T13:00:00-05:00");
    expect(chicagoWall(2026, 11, 8, 13)).toBe("2026-11-08T13:00:00-06:00");
  });
  it("adding days keeps the wall-clock time across the change", () => {
    expect(addChicagoDays("2026-10-31T13:00:00-05:00", 1)).toBe("2026-11-01T13:00:00-06:00");
    expect(addChicagoDays("2026-10-31T13:00:00-05:00", 8)).toBe("2026-11-08T13:00:00-06:00");
    expect(addChicagoDays("2026-11-08T13:00:00-06:00", -8)).toBe("2026-10-31T13:00:00-05:00");
  });
  it("the 25-hour day still counts as one calendar day", () => {
    expect(chicagoDaysBetween("2026-10-31T23:30:00-05:00", "2026-11-01T23:30:00-06:00")).toBe(1);
    expect(chicagoDaysBetween("2026-11-01T00:30:00-05:00", "2026-11-02T00:30:00-06:00")).toBe(1);
    expect(startOfChicagoDay("2026-11-01T15:00:00-06:00")).toBe("2026-11-01T00:00:00-05:00");
    expect(startOfChicagoDay("2026-11-02T15:00:00-06:00")).toBe("2026-11-02T00:00:00-06:00");
  });
  it("late evening Chicago is the next UTC day but the same Chicago day", () => {
    expect(startOfChicagoDay("2026-11-05T03:30:00Z")).toBe("2026-11-04T00:00:00-06:00");
  });
  it("spring forward gap resolves forward", () => {
    expect(chicagoWall(2027, 3, 14, 2, 30)).toBe("2027-03-14T03:30:00-05:00");
  });
});

describe("format", () => {
  const wed = new Date("2026-11-04T09:00:00-06:00");
  it("hangout strings match the canon", () => {
    expect(formatWhen("2026-11-08T13:00:00-06:00")).toBe("Sun, Nov 8 · 1:00 PM");
    expect(formatSpan("2026-11-08T13:00:00-06:00", "2026-11-08T15:00:00-06:00")).toBe("1:00-3:00 PM");
    expect(formatSpan("2026-11-08T11:30:00-06:00", "2026-11-08T13:00:00-06:00")).toBe("11:30 AM-1:00 PM");
    expect(formatTime("2026-11-08T13:00:00-06:00")).toBe("1:00 PM");
    expect(formatDay("2026-11-01T12:00:00-06:00")).toBe("Sunday, Nov 1");
    expect(formatPodStarted("2026-11-01T09:00:00-05:00")).toBe("Pod started Nov 1, 2026");
  });
  it("formats in Chicago even when given a UTC string", () => {
    expect(formatWhen("2026-11-08T19:00:00Z")).toBe("Sun, Nov 8 · 1:00 PM");
    expect(formatWhen("2026-10-31T18:00:00Z")).toBe("Sat, Oct 31 · 1:00 PM");
  });
  it("Hoopers reads In 4 days on the anchor, then Today, Happening now, Done", () => {
    const s = "2026-11-08T13:00:00-06:00";
    const e = "2026-11-08T15:00:00-06:00";
    expect(countdown(s, e, wed)).toBe("In 4 days");
    expect(countdown(s, e, new Date("2026-11-07T20:00:00-06:00"))).toBe("Tomorrow");
    expect(countdown(s, e, new Date("2026-11-08T08:00:00-06:00"))).toBe("Today");
    expect(countdown(s, e, new Date("2026-11-08T14:00:00-06:00"))).toBe("Happening now");
    expect(countdown(s, e, new Date("2026-11-08T15:15:00-06:00"))).toBe("Done");
  });
  it("countdown counts calendar days across DST", () => {
    expect(countdown("2026-11-02T13:00:00-06:00", "2026-11-02T15:00:00-06:00", new Date("2026-10-31T20:00:00-05:00"))).toBe("In 2 days");
  });
  it("card when, day dividers and relative times", () => {
    expect(formatCardWhen("2026-11-08T13:00:00-06:00", wed)).toBe("Sun 1:00 PM");
    expect(formatCardWhen("2026-11-15T13:00:00-06:00", wed)).toBe("Sun, Nov 15 · 1:00 PM");
    expect(formatDayDivider("2026-11-04T08:00:00-06:00", wed)).toBe("Today");
    expect(formatDayDivider("2026-11-03T23:00:00-06:00", wed)).toBe("Yesterday");
    expect(formatDayDivider("2026-11-01T10:00:00-06:00", wed)).toBe("Sunday, Nov 1");
    expect(formatRelative("2026-11-04T08:59:30-06:00", wed)).toBe("Just now");
    expect(formatRelative("2026-11-04T08:55:00-06:00", wed)).toBe("5 min ago");
    expect(formatRelative("2026-11-04T06:00:00-06:00", wed)).toBe("3 h ago");
    expect(formatRelative("2026-11-03T20:00:00-06:00", wed)).toBe("Yesterday");
    expect(formatRelative("2026-11-01T20:00:00-06:00", wed)).toBe("Sunday");
    expect(formatRelative("2026-10-20T20:00:00-05:00", wed)).toBe("Oct 20");
    expect(formatDuration(120)).toBe("2 hours");
    expect(formatDuration(90)).toBe("1 h 30 min");
  });
});
