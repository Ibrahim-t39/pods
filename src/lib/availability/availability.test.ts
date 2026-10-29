import { describe, expect, it } from "vitest";
import { effectiveSlots, slotFor } from "./exceptions";
import { weekWords } from "./words";
import { SLOTS, normalizeSlots, type Slot } from "@/lib/types";
import { dateForSlot, SLOT_HOURS } from "@/lib/planner/analyze";

describe("slotFor", () => {
  it("maps any date and part to its weekday slot", () => {
    expect(slotFor("2026-11-02", "morning")).toBe("monday-morning"); // Mon
    expect(slotFor("2026-11-05", "evening")).toBe("thursday-evening");
    expect(slotFor("2026-11-06", "afternoon")).toBe("friday-afternoon");
    expect(slotFor("2026-11-07", "morning")).toBe("saturday-morning");
    expect(slotFor("2026-11-08", "evening")).toBe("sunday-evening");
    for (let d = 1; d <= 14; d++) for (const p of ["morning", "afternoon", "evening"] as const) expect(SLOTS).toContain(slotFor(`2026-11-${String(d).padStart(2, "0")}`, p));
  });
});

describe("normalizeSlots", () => {
  it("expands the legacy weekday-evening to Mon-Fri evenings", () => {
    expect(normalizeSlots(["weekday-evening", "sunday-afternoon"])).toEqual([
      "monday-evening", "tuesday-evening", "wednesday-evening", "thursday-evening", "friday-evening", "sunday-afternoon",
    ]);
  });
  it("drops junk and duplicates and orders by the grid", () => {
    expect(normalizeSlots(["sunday-morning", "nope", "monday-morning", "sunday-morning"])).toEqual(["monday-morning", "sunday-morning"]);
    expect(normalizeSlots(null)).toEqual([]);
  });
  it("applies exceptions on top of a legacy week", () => {
    const user = { availability: ["weekday-evening"] as unknown as Slot[], blocked_days: [] };
    expect(effectiveSlots({ ...user, availability_exceptions: [{ date: "2026-11-03", part: "evening", status: "busy" }] })).not.toContain("tuesday-evening");
    expect(effectiveSlots({ ...user, availability_exceptions: [{ date: "2026-11-03", part: "morning", status: "free" }] })).toContain("tuesday-morning");
  });
});

describe("planner slots", () => {
  it("plans weekday daytime and evening on the right weekday and hour", () => {
    expect(dateForSlot("wednesday-morning", "2026-11-02")).toBe("2026-11-04");
    expect(SLOT_HOURS["wednesday-morning"].start).toBe("09:00");
    expect(SLOT_HOURS["monday-afternoon"].start).toBe("13:00");
    expect(SLOT_HOURS["friday-evening"].start).toBe("18:00");
    expect(SLOT_HOURS["saturday-morning"].start).toBe("10:00");
  });
});

describe("weekWords", () => {
  it("reads naturally", () => {
    expect(weekWords(["tuesday-evening", "thursday-evening", "saturday-afternoon", "sunday-afternoon"])).toBe("Tue and Thu evenings, weekend afternoons");
    expect(weekWords(["weekday-evening"])).toBe("weeknights");
    expect(weekWords(["weekday-evening", "saturday-afternoon", "sunday-afternoon"])).toBe("weeknights, weekend afternoons");
    expect(weekWords(["saturday-morning", "saturday-afternoon", "saturday-evening"])).toBe("Saturdays all day");
    expect(weekWords(["monday-morning", "wednesday-morning", "friday-morning"])).toBe("Mon, Wed and Fri mornings");
    expect(weekWords(["tuesday-afternoon", "tuesday-evening"])).toBe("Tuesday afternoons and evenings");
    expect(weekWords([...SLOTS])).toBe("any time");
    expect(weekWords([])).toBe("");
  });
});
