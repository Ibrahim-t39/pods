import { describe, expect, it } from "vitest";
import { produce } from "immer";
import { buildSeed } from "@/data/seed";
import { DEMO } from "@/config/demo";
import { applyRsvp } from "@/lib/db/local/hangouts";
import { buildInbox, reminders } from "./rules";

const at = (iso: string) => new Date(iso).toISOString();

describe("hangout reminders", () => {
  const me = "u_me";
  const base = produce(buildSeed(DEMO.anchor), (d) => {
    const m = d.memberships.find((x) => x.pod_id === DEMO.hoopers.podId)!;
    d.me = me;
    d.memberships.push({ ...m, user_id: me, left_at: null, muted: false });
  });
  const sug = DEMO.hoopers.suggestionId;
  const joined = produce(base, (d) => {
    applyRsvp(d, sug, me, "going", DEMO.anchor);
  });

  it("nothing before you say I'm in", () => {
    expect(reminders(base, at("2026-11-06T10:00:00-06:00"), new Set(), false).filter((r) => r.podId === DEMO.hoopers.podId)).toEqual([]);
  });

  it("no reminder more than 24h out", () => {
    expect(reminders(joined, at("2026-11-06T09:59:00-06:00"), new Set(), false).filter((r) => r.podId === DEMO.hoopers.podId)).toEqual([]);
  });

  it("Friday 10am shows the 24h reminder in the Inbox", () => {
    const items = buildInbox(joined, at("2026-11-06T10:00:00-06:00"), new Set(), false).filter((i) => i.id.startsWith("d:r24:"));
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Tomorrow 10am · Pickup basketball");
    expect(items[0].href).toBe(`/app/pods/${DEMO.hoopers.podId}`);
  });

  it("two hours out swaps to the directions reminder", () => {
    const items = reminders(joined, at("2026-11-07T08:00:00-06:00"), new Set(), false).filter((r) => r.podId === DEMO.hoopers.podId);
    expect(items.map((i) => i.id.split(":")[1])).toEqual(["r2"]);
    expect(items[0].title).toBe("In 2 hours · Brahan Spring Park");
    expect(items[0].href).toMatch(/^https:\/\/www\.google\.com\/maps/);
  });

  it("gone once it starts", () => {
    expect(reminders(joined, at("2026-11-07T10:00:00-06:00"), new Set(), false).filter((r) => r.podId === DEMO.hoopers.podId)).toEqual([]);
  });
});
