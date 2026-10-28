// [U4] Planner: payload privacy (D11), validation, fallback quality, pipeline shape, repeat loop in the repo.
import { describe, expect, it, beforeEach } from "vitest";
import { useStore, freshDb } from "@/lib/db/store";
import { localRepo } from "@/lib/db/local";
import { activeSuggestion } from "@/lib/db/selectors";
import { DEMO } from "@/config/demo";
import { jumpTo } from "@/lib/time/clock";
import { buildPlannerInput, podActivity } from "./adapt";
import { PlannerInputSchema } from "./schema";
import { runPlanner } from "./run";
import { validatePlan } from "./validate";
import { applyCheckIn, applyRunItBack, applyVote, runItBackTally } from "@/lib/db/local/hangouts";
import { fallbackWhyFits, fallbackWiden, template } from "./fallback";
import type { PlannerEvent } from "./types";

async function collect(gen: AsyncGenerator<PlannerEvent>) {
  const out: PlannerEvent[] = [];
  for await (const e of gen) out.push(e);
  return out;
}

async function placeChanda() {
  const repo = localRepo();
  const ch = await repo.startPhoneAuth("(256) 555-0142");
  if (!ch.ok) throw new Error("auth");
  await repo.verifyPhoneCode(ch.data.challengeId, "123456");
  await repo.updateAbout({ first_name: "Chanda", nickname: null, date_of_birth: "2004-03-14", city: "Huntsville" });
  await repo.setInterests(["basketball", "guitar"]);
  await repo.setIdentity({ heritage: { level: "country", code: "ZM" }, faith: { level: "denomination", code: "sda" }, consent: true });
  await repo.setAvailability(["weekday-evening", "sunday-afternoon"], ["saturday"]);
  await repo.acceptPledge();
  await repo.submitVerification({});
  await repo.runPlacement();
  return repo;
}

describe("planner payload (D11)", () => {
  beforeEach(() => useStore.setState({ db: freshDb(), hydrated: true }));

  it("contains no names, ids, heritage, faith or blocked days, for every pod", () => {
    const db = useStore.getState().db;
    const banned = [
      ...Object.values(db.users).map((u) => u.first_name),
      "Zambia", "Zambian", "Southern African", "Adventist", "Seventh", "Muslim", "West African", "sda", "southern_african", "blocked", "user_",
    ];
    for (const podId of Object.keys(db.pods)) {
      const input = buildPlannerInput(db, podId, { nowISO: DEMO.anchor });
      expect(PlannerInputSchema.safeParse(input).success).toBe(true);
      const body = JSON.stringify(input);
      for (const b of banned) expect(body.includes(`"${b}"`) || new RegExp(`\\b${b}\\b`).test(body), `${podId} leaks ${b}`).toBe(false);
    }
  });

  it("community pods travel as a neutral activity", () => {
    const db = useStore.getState().db;
    expect(podActivity(db, DEMO.southernAfrican.podId)).toMatchObject({ kind: "community", activity: "picnic" });
  });

  it("rejects unknown keys (a name sneaking in)", () => {
    const db = useStore.getState().db;
    const input = buildPlannerInput(db, DEMO.hoopers.podId, { nowISO: DEMO.anchor }) as unknown as Record<string, unknown>;
    expect(PlannerInputSchema.safeParse({ ...input, members: [{ name: "Malik" }] }).success).toBe(false);
  });
});

describe("pipeline", () => {
  beforeEach(() => useStore.setState({ db: freshDb(), hydrated: true }));

  it("runs on-device with the template and validates the venue", async () => {
    const db = useStore.getState().db;
    const input = buildPlannerInput(db, DEMO.hoopers.podId, { nowISO: DEMO.anchor });
    const ev = await collect(runPlanner(input, { mode: "local" }));
    const ids = ev.filter((e) => e.type === "step").map((e) => (e as { id: string }).id);
    expect(ids).toEqual(expect.arrayContaining(["pod", "time", "venues", "weather", "draft", "validate"]));
    const plan = ev.find((e) => e.type === "plan");
    expect(plan && plan.type === "plan" && plan.source).toBe("local");
    if (plan?.type === "plan") expect(db.venues[plan.plan.venue_id].active).toBe(true);
  });

  it("retries once on a rule-breaking Claude plan, then falls back honestly", async () => {
    const db = useStore.getState().db;
    const input = buildPlannerInput(db, DEMO.hoopers.podId, { nowISO: DEMO.anchor });
    const bad = { summary: "x", event: "x", starts_at: "2026-11-08T13:00:00", ends_at: "2026-11-08T15:00:00", venue_id: "venue_nope", cost: "Free", bring: ["a"], schedule: [{ time: "1", item: "a" }, { time: "2", item: "b" }], rain_plan: "x", icebreaker: "x", reason: "x" };
    let calls = 0;
    const claude = { plan: async () => { calls++; return { ok: true as const, data: bad }; } } as never;
    const ev = await collect(runPlanner(input, { mode: "server", claude, forecast: async () => null }));
    expect(calls).toBe(2);
    expect(ev.some((e) => e.type === "step" && e.id === "retry")).toBe(true);
    const p = ev.find((e) => e.type === "plan");
    expect(p?.type === "plan" && p.source).toBe("fallback");
  });

  it("next_options gives the canonical options 1-2 for Hoopers", async () => {
    const repo = await placeChanda();
    const s = activeSuggestion(useStore.getState().db, DEMO.hoopers.podId)!;
    await repo.rsvp(s.id, "going");
    const db = useStore.getState().db;
    const h = Object.values(db.hangouts).find((x) => x.suggestion_id === s.id)!;
    const input = buildPlannerInput(db, DEMO.hoopers.podId, { nowISO: DEMO.directorJump.at, afterHangoutId: h.id });
    const ev = await collect(runPlanner(input, { mode: "local" }, "next_options"));
    const o = ev.find((e) => e.type === "options");
    expect(o?.type).toBe("options");
    if (o?.type !== "options") return;
    expect(o.options).toHaveLength(3);
    expect(o.options[0].plan.starts_at).toBe(DEMO.hangout2Options[0].starts_at);
    expect(o.options[1].plan.starts_at).toBe(DEMO.hangout2Options[1].starts_at);
    expect(o.options[1].venue.id).toBe("venue_showers_rec");
    expect(o.options[2].source).toBe("seed"); // cached Claude draft (recording rule)
  });
});

describe("validation + fallback quality", () => {
  beforeEach(() => useStore.setState({ db: freshDb(), hydrated: true }));
  it("every pod's template plan passes validation", async () => {
    const db = useStore.getState().db;
    for (const podId of Object.keys(db.pods)) {
      const input = buildPlannerInput(db, podId, { nowISO: DEMO.anchor });
      const ev = await collect(runPlanner(input, { mode: "local" }));
      const p = ev.find((e) => e.type === "plan" || e.type === "error");
      if (p?.type === "error") continue; // no venue fits: "Our team is choosing a spot"
      expect(p?.type).toBe("plan");
      if (p?.type !== "plan") continue;
      expect(p.plan.summary.length).toBeLessThanOrEqual(70);
      expect(p.plan.reason).toMatch(/of \d+ of you|Few people/);
      const v = validatePlan({ ...p.plan, starts_at: p.plan.starts_at.slice(0, 19), ends_at: p.plan.ends_at.slice(0, 19) }, {
        candidates: p.analysis.candidates, allVenues: input.venues, date: p.analysis.date, budgetMax: 15, starter: true, window: input.rules.starterWindow,
      });
      expect(v.errors, podId).toEqual([]);
    }
    expect(template("nope").event.length).toBeGreaterThan(5);
  });
  it("line templates stay within caps", () => {
    expect(fallbackWhyFits({ activity: "basketball", kind: "interest", size: 8, topSlot: { label: "Sunday afternoons", free: 7 }, ageBand: [19, 25], metro: "Huntsville" }).line.length).toBeLessThanOrEqual(90);
    expect(fallbackWiden({ steps: [{ label: "Zambians", nearby: 3 }, { label: "Southern African", nearby: 7 }], minSize: 6 }).body).toContain("3");
  });
});

describe("repeat loop (repo)", () => {
  beforeEach(() => useStore.setState({ db: freshDb(), hydrated: true }));
  it("lock → check-in → private ballot → reveal at 4 yes → vote → hangout #2 locked", async () => {
    const repo = await placeChanda();
    const s = activeSuggestion(useStore.getState().db, DEMO.hoopers.podId)!;
    expect((await repo.rsvp(s.id, "going")).ok).toBe(true);
    let db = useStore.getState().db;
    const h = Object.values(db.hangouts).find((x) => x.suggestion_id === s.id)!;
    expect((await repo.checkIn(h.id)).ok).toBe(false); // before it starts
    jumpTo(DEMO.directorJump.at);
    expect((await repo.checkIn(h.id)).ok).toBe(true);
    const bots = db.memberships.filter((m) => m.pod_id === DEMO.hoopers.podId && m.user_id !== db.me).map((m) => m.user_id);
    const now = DEMO.directorJump.at;
    useStore.getState().commit((d) => {
      for (const u of bots.slice(0, 5)) applyCheckIn(d, h.id, u, now);
      applyRunItBack(d, h.id, bots[0], "yes", now);
      applyRunItBack(d, h.id, bots[1], "yes", now);
      applyRunItBack(d, h.id, bots[2], "not_sure", now);
      applyRunItBack(d, h.id, bots[3], "yes", now);
    });
    expect(runItBackTally(useStore.getState().db, h.id).revealed).toBe(false); // 3 yes: no number
    const t = await repo.castRunItBack(h.id, "yes");
    expect(t.ok && t.data).toMatchObject({ yes: 4, answered: 5, revealed: true });
    db = useStore.getState().db;
    expect(db.messages[DEMO.hoopers.podId].some((m) => m.kind === "run_it_back" && m.text === "4 of 5 want to run it back.")).toBe(true);
    expect(db.memberships.filter((m) => m.pod_id === DEMO.hoopers.podId && m.role === "admin").length).toBe(2);

    // Options → vote → lock at 4
    const input = buildPlannerInput(db, DEMO.hoopers.podId, { nowISO: now, afterHangoutId: h.id });
    const ev = await collect(runPlanner(input, { mode: "local" }, "next_options"));
    const o = ev.find((e) => e.type === "options");
    if (o?.type !== "options") throw new Error("no options");
    const ids: string[] = [];
    for (const [i, opt] of o.options.entries()) {
      const r = await repo.saveSuggestion({ pod_id: DEMO.hoopers.podId, summary: opt.plan.summary, plan_json: opt.plan, venue_id: opt.venue.id, starts_at: opt.plan.starts_at, status: "suggested", source: "fallback", round: 2, option_index: i as 0 | 1 | 2, trace: [] });
      expect(r.ok).toBe(true);
      if (r.ok) ids.push(r.data.id);
    }
    db = useStore.getState().db;
    const vote = Object.values(db.votes).find((v) => v.pod_id === DEMO.hoopers.podId && v.status === "open")!;
    expect(vote.option_ids).toEqual(ids);
    useStore.getState().commit((d) => { for (const u of bots.slice(0, 3)) applyVote(d, vote.id, u, ids[0], now); });
    await repo.voteNextOption(vote.id, ids[0]);
    db = useStore.getState().db;
    expect(db.votes[vote.id].status).toBe("closed");
    const h2 = Object.values(db.hangouts).find((x) => x.suggestion_id === ids[0])!;
    expect(h2.sequence).toBe(2);
    expect(h2.starts_at).toBe("2026-11-22T13:00:00-06:00");
    expect(db.messages[DEMO.hoopers.podId].some((m) => m.text.startsWith("Round two. Locked."))).toBe(true);
    expect((await repo.saveSuggestion({ pod_id: DEMO.hoopers.podId, summary: "x", plan_json: o.options[0].plan, venue_id: o.options[0].venue.id, starts_at: "", status: "suggested", source: "fallback", round: 3, option_index: 2, trace: [] })).ok).toBe(true);
  });
});
