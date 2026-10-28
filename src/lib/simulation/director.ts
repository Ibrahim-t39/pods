// [U11] Director actions (ARCHITECTURE §11, BLUEPRINT SY-04). Plain async functions the DirectorPanel calls; also
// usable from tests and the browser console (window.__pods is wired by DemoRuntime in non-production builds).
// Simulation-layer writes (other people's check-ins, answers) commit to the store directly; the signed-in user's
// own actions always go through the Repo.
"use client";

import { DEMO } from "@/config/demo";
import { applyVenueVariant } from "@/data/seed";
import { useStore } from "@/lib/db/store";
import type { Repo } from "@/lib/db/repo";
import { hash32 } from "@/lib/ids";
import { jumpTo, nowISO, nowMs } from "@/lib/time/clock";
import type { DbState, Hangout, ID, RunItBackAnswer } from "@/lib/types";
import { settleHangouts } from "./script";

export interface ActionResult {
  ok: boolean;
  message: string;
}
const done = (message: string): ActionResult => ({ ok: true, message });
const fail = (message: string): ActionResult => ({ ok: false, message });
const db = () => useStore.getState().db;

/** The demo pod's current hangout: newest non-cancelled hangout of the Hoopers pod, else any pod's newest. */
export function demoHangout(d: DbState = db()): Hangout | undefined {
  const all = Object.values(d.hangouts).filter((h) => h.status !== "cancelled");
  const mine = all.filter((h) => h.pod_id === DEMO.hoopers.podId);
  const pool = mine.length ? mine : all;
  return pool.sort((a, b) => b.sequence - a.sequence || Date.parse(b.starts_at) - Date.parse(a.starts_at))[0];
}

export async function resetDemo(repo: Repo): Promise<ActionResult> {
  const r = await repo.admin.resetDemo();
  return r.ok ? done("Demo reset to a fresh start.") : fail("Couldn't reset.");
}

/** Create Chanda (the persona), verify her and place her, as if onboarding had finished. */
export async function skipToPlaced(repo: Repo): Promise<ActionResult> {
  const d = db();
  if (d.me && d.users[d.me]?.onboarding_step === "done") return done("Already placed.");
  const id: ID = "user_chanda";
  const at = nowISO();
  useStore.getState().commit((x) => {
    x.users[id] = {
      id,
      first_name: DEMO.persona.first_name,
      nickname: null,
      pronouns: "she/her",
      bio: "New in town. Hoops on Saturdays, guitar when it's quiet.",
      prompts: [],
      photo_urls: ["/avatars/preset-01.svg"],
      date_of_birth: "2004-03-14",
      city: "Huntsville",
      phone: "+12565550142",
      verified: true,
      verified_at: at,
      availability: ["weekday-evening", "sunday-afternoon"],
      blocked_days: ["saturday"],
      created_at: at,
      status: "active",
      onboarding_step: "placing",
      pledge_accepted_at: at,
      is_demo_bot: false,
      notification_prefs: { email: true, sms: true, push: true },
    };
    x.userInterests = x.userInterests.filter((u) => u.user_id !== id).concat([
      { user_id: id, interest_id: "basketball" },
      { user_id: id, interest_id: "guitar" },
    ]);
    x.identities[id] = {
      user_id: id,
      heritage: { level: "country", code: "ZM" },
      faith: { level: "denomination", code: "sda" },
      consent_given_at: at,
    };
    x.verifications[id] = { user_id: id, vendor: "simulated", status: "approved", reason: null, created_at: at, decided_at: at };
    x.me = id;
  });
  const r = await repo.runPlacement();
  return r.ok ? done("Placed. Chanda is in her pods.") : fail(`Placement failed: ${r.error.code}`);
}

/** Move the clock to just after the hangout (Sat 12:15 PM), mark the hangout done, post the check-in prompt. */
export function jumpAfterHangout(): ActionResult {
  jumpTo(DEMO.directorJump.at);
  useStore.getState().commit((x) => {
    settleHangouts(x, nowMs(), nowISO());
  });
  return done("It's Saturday 12:15 PM. The check-in prompt is out.");
}

/** Every "going" member of the demo hangout is checked in (the prompt is posted first if the clock was not jumped). */
export function everyoneChecksIn(): ActionResult {
  const h = demoHangout();
  if (!h) return fail("No locked hangout yet.");
  const at = nowISO();
  let n = 0;
  useStore.getState().commit((x) => {
    for (const r of x.rsvps) {
      if (r.hangout_id === h.id && r.status === "going" && !r.checked_in) {
        r.checked_in = true;
        r.checked_in_at = at;
        n++;
      }
    }
  });
  return done(n ? `${n} checked in.` : "Everyone was already checked in.");
}

/**
 * Fill in the simulated members' run-it-back answers (all yes except one "not sure"), then reveal.
 * Only the aggregate is ever shown; individual answers stay private.
 */
export function revealRunItBack(): ActionResult {
  const h = demoHangout();
  if (!h) return fail("No hangout yet.");
  const at = nowISO();
  useStore.getState().commit((x) => {
    const rib = (x.runItBack[h.id] ??= { hangout_id: h.id, responses: {}, revealed_at: null });
    const bots = x.rsvps
      .filter((r) => r.hangout_id === h.id && r.checked_in && x.users[r.user_id]?.is_demo_bot)
      .map((r) => r.user_id)
      .sort((a, b) => hash32(`${h.id}:${a}`) - hash32(`${h.id}:${b}`));
    bots.forEach((u, i) => {
      const ans: RunItBackAnswer = i === bots.length - 1 && bots.length >= 3 ? "not_sure" : "yes";
      rib.responses[u] ??= ans;
    });
    rib.revealed_at ??= at;
  });
  const rib = db().runItBack[h.id];
  const yes = Object.values(rib.responses).filter((a) => a === "yes").length;
  const checked = db().rsvps.filter((r) => r.hangout_id === h.id && r.checked_in).length;
  return done(`${yes} of ${checked} want to run it back.`);
}

/** "Make it rain": the Hoopers run moves indoors to the Rec Center (toggle back to the park courts). */
export function makeItRain(): ActionResult {
  const on = db().config.demo.venueVariant === "park_courts";
  useStore.getState().commit((x) => applyVenueVariant(x, on ? "rec_center" : "park_courts"));
  return done(on ? "Rain plan on: indoors at the Rec Center." : "Back to the park courts.");
}

/** One simulated member who was going switches to "can't make it" (shows the count dropping and the host reply). */
export function oneDecline(): ActionResult {
  const d = db();
  const target = demoHangout(d)?.id ?? DEMO.hoopers.suggestionId;
  const victim = d.rsvps
    .filter((r) => r.hangout_id === target && r.status === "going" && d.users[r.user_id]?.is_demo_bot)
    .sort((a, b) => hash32(`${target}:${a.user_id}`) - hash32(`${target}:${b.user_id}`))[0];
  if (!victim) return fail("Nobody to decline.");
  useStore.getState().commit((x) => {
    const r = x.rsvps.find((y) => y.hangout_id === target && y.user_id === victim.user_id);
    if (r) r.status = "not_going";
  });
  return done("One member can't make it.");
}

// ── Config toggles (go through the Repo so they are audited) ─────────────
type DemoKey = "noAI" | "crowd" | "fastLatency";
export async function setDemoFlag(repo: Repo, key: DemoKey, value: boolean): Promise<ActionResult> {
  const cur = db().config.demo;
  const r = await repo.admin.setConfig({ demo: { ...cur, [key]: value } });
  return r.ok ? done("Saved.") : fail("Couldn't save.");
}

/** Health: GET /api/health?deep=1 (key present + one real Claude call). The route is U4/U0's; absent = say so. */
export async function checkHealth(): Promise<ActionResult> {
  try {
    const res = await fetch("/api/health?deep=1", { cache: "no-store" });
    if (!res.ok) return fail(res.status === 404 ? "No /api/health route yet." : `Health returned ${res.status}.`);
    const body = (await res.json()) as { ok?: boolean; keyPresent?: boolean; claude?: string; ms?: number };
    return {
      ok: body.ok !== false,
      message: `Key ${body.keyPresent ? "present" : "missing"}${body.claude ? ` · Claude ${body.claude}` : ""}${body.ms ? ` · ${body.ms} ms` : ""}`,
    };
  } catch {
    return fail("Health check couldn't run (offline?).");
  }
}

