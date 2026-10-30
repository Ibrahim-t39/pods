import { describe, expect, it } from "vitest";
import { buildSeed } from "@/data/seed";
import { DEMO } from "@/config/demo";
import { decide, inQuietHours, maskText, podLabel, COMMUNITY_LABEL } from "./rules";

const gate = { groups: { hangouts: true, runItBack: true, podChat: true, news: false }, quietHours: true };

describe("notification rules", () => {
  const db = buildSeed(DEMO.anchor);
  it("quiet hours are 10 PM to 8 AM Seattle", () => {
    expect(inQuietHours("2026-11-04T23:00:00-08:00")).toBe(true);
    expect(inQuietHours("2026-11-04T07:59:00-08:00")).toBe(true);
    expect(inQuietHours("2026-11-04T09:00:00-08:00")).toBe(false);
  });
  it("safety always goes through", () => {
    expect(decide(db, "u", "report_update", null, "2026-11-04T23:00:00-08:00", gate).send).toBe(true);
  });
  it("discreet mode hides community pod names", () => {
    expect(podLabel({ name: "Southern African", type: "community" }, true)).toBe(COMMUNITY_LABEL);
    expect(podLabel({ name: "Hoopers", type: "interest" }, true)).toBe("Hoopers");
    expect(maskText("Plan for Adventist young adults", { name: "Adventist young adults", topic: "x", type: "community" }, true)).toBe(`Plan for ${COMMUNITY_LABEL}`);
  });
});
