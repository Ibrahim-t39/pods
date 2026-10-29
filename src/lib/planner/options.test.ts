// Round-two vote options never repeat a slot (sweep 10/29: Live showed "Nov 14, 10am" twice).
import { describe, expect, it } from "vitest";
import { withoutRepeats } from "./run";
import type { NextOption } from "./types";

const opt = (starts_at: string, venue: string, label: string) => ({ label, plan: { starts_at }, venue: { id: venue } }) as unknown as NextOption;

describe("withoutRepeats", () => {
  it("drops a later option at the same start and venue", () => {
    const out = withoutRepeats([opt("2026-11-14T10:00:00", "v_park", "Same time"), opt("2026-11-12T18:30:00", "v_rec", "Weeknight"), opt("2026-11-14T10:00:00", "v_park", "AI pick")]);
    expect(out.map((o) => o.label)).toEqual(["Same time", "Weeknight"]);
  });
  it("keeps the same time at another venue", () => {
    expect(withoutRepeats([opt("2026-11-14T10:00:00", "v_park", "a"), opt("2026-11-14T10:00:00", "v_rec", "b")])).toHaveLength(2);
  });
});
