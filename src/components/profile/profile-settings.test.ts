// Sweep 10/29: reminders, contact, profile pod lines and birthday edits.
import { describe, expect, it } from "vitest";
import type { DbState } from "@/lib/types";
import type { PlanItem } from "@/lib/platform/selectors";
import { contactFor } from "@/components/legal/contact";
import { DEFAULT_REMINDERS, REMINDER_KINDS, remindersHint, remindersValue } from "./words";
import { podNextLine, shortWhen, votingOn } from "./pod-line";
import { birthdayProblem } from "./age";

describe("reminders", () => {
  it("defaults to the day before and 2 hours before", () => {
    expect(DEFAULT_REMINDERS).toEqual({ plan: false, before: true, on: true });
    expect(remindersHint(DEFAULT_REMINDERS)).toBe("In the app, the day before and 2 hours before");
  });
  it("lets more than one be on, and never promises a text", () => {
    const all = { plan: true, before: true, on: true };
    expect(remindersHint(all)).toBe("In the app, when a plan is ready, the day before and 2 hours before");
    expect(remindersValue(all)).toBe("On");
    expect(remindersValue({ plan: false, before: false, on: false })).toBe("Off");
    for (const k of REMINDER_KINDS) expect(`${k.label} ${k.when}`).not.toMatch(/text/i);
  });
});

describe("contact", () => {
  it("points at the help page until a real inbox is set", () => {
    const c = contactFor(null);
    expect(c).toMatchObject({ ready: false, href: "/safety", external: false });
    expect(c.href).not.toMatch(/pods\.example/);
  });
  it("becomes a mail link once an inbox is set", () => {
    expect(contactFor("help@pods.co")).toMatchObject({ ready: true, href: "mailto:help@pods.co", label: "Write to us" });
  });
});

const plan = (o: Partial<PlanItem>): PlanItem =>
  ({ id: "x", kind: "plan", podId: "p1", starts_at: "2026-11-07T16:00:00.000Z", locked: false, ...o }) as PlanItem;
const NOW = Date.parse("2026-11-01T12:00:00.000Z");

describe("profile pod line", () => {
  it("formats times as labels", () => {
    expect(shortWhen("2026-11-07T16:00:00.000Z")).toBe("Sat, Nov 7 · 10am");
    expect(shortWhen("2026-11-07T16:00:00.000Z")).not.toMatch(/AM|:00/);
  });
  it("reads 'Voting on #2' while a vote is open, not one option's date", () => {
    const db = {
      votes: { v1: { id: "v1", pod_id: "p1", after_hangout_id: "h1", option_ids: [], votes: {}, closes_at: "2026-11-03T00:00:00.000Z", status: "open", winner_id: null } },
      hangouts: { h1: { id: "h1", pod_id: "p1", sequence: 1, status: "done", ends_at: "2026-10-24T18:00:00.000Z" } },
    } as unknown as DbState;
    expect(votingOn(db, "p1", [plan({})], NOW)).toBe(2);
    expect(podNextLine(db, "p1", [plan({})], NOW)).toBe("Voting on #2");
  });
  it("treats two open options as a vote, and one locked plan as its date", () => {
    const db = { votes: {}, hangouts: {} } as unknown as DbState;
    expect(podNextLine(db, "p1", [plan({ id: "a" }), plan({ id: "b" })], NOW)).toBe("Voting on #1");
    expect(podNextLine(db, "p1", [plan({ kind: "hangout", locked: true })], NOW)).toBe("Locked Sat, Nov 7 · 10am");
    expect(podNextLine(db, "p1", [], NOW)).toBe("Planning the first one");
  });
});

describe("birthday", () => {
  const L = { minAge: 18, maxAge: 29 };
  it("accepts an age inside the range", () => expect(birthdayProblem("2000-05-01", "2026-10-29T00:00:00Z", L)).toBeNull());
  it("refuses under 18 without deleting anything", () => expect(birthdayProblem("2012-05-01", "2026-10-29T00:00:00Z", L)).toBe("Pods is for 18 and older."));
  it("refuses a bad date", () => expect(birthdayProblem("", "2026-10-29T00:00:00Z", L)).toBe("Enter a real date."));
});
