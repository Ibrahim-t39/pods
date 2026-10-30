import { describe, expect, it } from "vitest";
import type { CalItem } from "@/lib/platform/calendar";
import type { PodStatus, RoomTable } from "./model";
import { greeting, inLine, planDay, planWhen, upNext, weekGlance } from "./home-model";

// Wed Nov 4 2026, 9:00 Seattle (PST, -08:00)
const NOW = Date.parse("2026-11-04T09:00:00-08:00");
const SAT = "2026-11-07T10:00:00-08:00";
const SAT_END = "2026-11-07T12:00:00-08:00";
const NOV15 = "2026-11-15T13:00:00-08:00";

function table(id: string, status: PodStatus, plan?: { startsAt: string; endsAt: string }, open = true): RoomTable {
  return {
    row: {
      pod: { id } as RoomTable["row"]["pod"],
      status,
      plan: plan ? ({ ...plan, s: { status: "proposed" }, cantMake: false } as unknown as NonNullable<RoomTable["row"]["plan"]>) : null,
    } as RoomTable["row"],
    hue: "ember",
    open,
    people: [],
    held: 0,
  };
}

describe("upNext", () => {
  it("leads with the soonest hangout and keeps it on top after I'm in and after it locks", () => {
    const sa = table("sa", "needs_rsvp", { startsAt: NOV15, endsAt: "2026-11-15T15:00:00-08:00" });
    for (const st of ["needs_rsvp", "youre_in", "locked"] as PodStatus[]) {
      const hoopers = table("hoopers", st, { startsAt: SAT, endsAt: SAT_END });
      const { lead, rest } = upNext([hoopers, sa], NOW, "sa");
      expect(lead?.row.pod.id).toBe("hoopers");
      expect(rest.map((t) => t.row.pod.id)).toEqual(["sa"]);
    }
  });

  it("puts a check-in ahead of later plans, and skips on-deck pods", () => {
    const hoopers = table("hoopers", "checkin_due");
    const sa = table("sa", "needs_rsvp", { startsAt: NOV15, endsAt: "2026-11-15T15:00:00-08:00" });
    const deck = table("strings", "on_deck", undefined, false);
    const { lead, rest } = upNext([deck, sa, hoopers], NOW);
    expect(lead?.row.pod.id).toBe("hoopers");
    expect(rest.map((t) => t.row.pod.id)).toEqual(["sa"]);
  });

  it("drops a finished plan and falls back to the moment's pick", () => {
    const hoopers = table("hoopers", "vote_open", { startsAt: "2026-11-01T10:00:00-08:00", endsAt: "2026-11-01T12:00:00-08:00" });
    const { lead } = upNext([hoopers], NOW, "hoopers");
    expect(lead?.row.pod.id).toBe("hoopers");
  });
});

describe("planDay / planWhen", () => {
  it("says Today, Tomorrow, the weekday this week, a date beyond", () => {
    expect(planDay("2026-11-04T19:00:00-08:00", NOW)).toBe("Today");
    expect(planDay("2026-11-05T10:00:00-08:00", NOW)).toBe("Tomorrow");
    expect(planDay(SAT, NOW)).toBe("Sat");
    expect(planWhen(SAT, NOW)).toBe("Sat 10am");
    expect(planWhen(NOV15, NOW)).toBe("Sun, Nov 15 · 1pm");
  });
});

const item = (kind: CalItem["kind"], starts_at: string, ends_at = starts_at): CalItem =>
  ({ id: `${kind}${starts_at}`, kind, podId: "p", podName: "P", title: "T", line: "", starts_at, ends_at, day: starts_at.slice(0, 10), href: "", needsYou: false, venue: null });

describe("weekGlance", () => {
  it("counts hangouts within 7 days, not votes or later plans", () => {
    const items = [item("plan", SAT, SAT_END), item("vote", "2026-11-06T18:00:00-08:00"), item("plan", NOV15, NOV15)];
    expect(weekGlance(items, NOW)).toMatchObject({ count: 1, line: "1 plan · Sat" });
  });
  it("stops counting a hangout once it has ended", () => {
    const items = [item("hangout", SAT, SAT_END)];
    expect(weekGlance(items, Date.parse("2026-11-07T11:00:00-08:00")).line).toBe("1 plan · Today");
    expect(weekGlance(items, Date.parse("2026-11-07T12:30:00-08:00")).line).toBe("Nothing else this week");
  });
});

describe("greeting", () => {
  it("is Hi at night", () => {
    expect(greeting(2)).toBe("Hi");
    expect(greeting(6)).toBe("Good morning");
    expect(greeting(14)).toBe("Good afternoon");
    expect(greeting(22)).toBe("Good evening");
  });
});

describe("inLine", () => {
  it("names who is in", () => {
    expect(inLine(["Malik"])).toBe("Malik is in");
    expect(inLine(["Malik", "Ama", "Tobi"])).toBe("Malik, Ama and Tobi are in");
    expect(inLine(["You", "Malik", "Ama", "Tobi", "Kayla"])).toBe("You, Malik, Ama and 2 more are in");
    expect(inLine(["You"])).toBe("You are in");
  });
});
