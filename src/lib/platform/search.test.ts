// Search (sweep 10/29): stems ("hike" finds Hiking and the Wanderers' trail walk) and canonical plan links.
import { beforeEach, describe, expect, it } from "vitest";
import { useStore, freshDb } from "@/lib/db/store";
import { localRepo } from "@/lib/db/local";
import { nowISO, nowMs } from "@/lib/time/clock";
import { skipToPlaced } from "@/lib/simulation/director";
import { myPlans, planHref, searchAll, searchMatch, stem } from "./selectors";

const db = () => useStore.getState().db;

describe("search", () => {
  beforeEach(async () => {
    useStore.setState({ db: freshDb("demo"), hydrated: true, mode: "demo" });
    await skipToPlaced(localRepo());
  });

  it("matches by stem", () => {
    expect(stem("hiking")).toBe(stem("hike"));
    expect(searchMatch("Hiking", "hike")).toBe(true);
    expect(searchMatch("Sunday trail walk", "hike")).toBe(false);
    expect(searchMatch("Pickup basketball", "basket")).toBe(true);
  });

  it("'hike' finds the Wanderers plan and the Hiking interest", () => {
    const hits = searchAll(db(), "hike", nowISO(), 40);
    expect(hits.some((h) => h.kind === "plan" && h.sub.startsWith("Wanderers"))).toBe(true);
    expect(hits.some((h) => h.kind === "interest" && h.label.toLowerCase() === "hiking")).toBe(true);
  });

  it("plan hits and Coming up open the canonical plan sheet", () => {
    const plan = myPlans(db(), nowMs()).upcoming[0];
    expect(planHref(db(), plan)).toMatch(new RegExp(`^/app/pods/${plan.podId}/plan/[^/]+$`));
    const hits = searchAll(db(), "pickup", nowISO(), 40).filter((h) => h.kind === "plan" && !h.id.startsWith("discover:"));
    expect(hits.length).toBeGreaterThan(0);
    for (const h of hits) expect(h.href).toMatch(/^\/app\/pods\/[^/]+\/plan\/[^/]+$/);
  });
});
