// [U4] Planner lab (dev only). Sets up demo states through the real repo + the exported hangout transactions.
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";
import { HangoutCard } from "@/components/planner/hangout-card";
import { PlannerTrace, traceRows } from "@/components/planner/planner-trace";
import { useDb, useHydrated, useRepo } from "@/lib/db/hooks";
import { useStore } from "@/lib/db/store";
import { activeSuggestion } from "@/lib/db/selectors";
import { applyCheckIn, applyRsvp, applyRunItBack, applyVote } from "@/lib/db/local/hangouts";
import { jumpTo, nowISO } from "@/lib/time/clock";
import { DEMO } from "@/config/demo";
import { localRepo } from "@/lib/db/local";

const POD = DEMO.hoopers.podId;

async function ensurePlaced() {
  const repo = localRepo();
  if (useStore.getState().db.me) return repo;
  const ch = await repo.startPhoneAuth("(256) 555-0142");
  if (!ch.ok) return repo;
  await repo.verifyPhoneCode(ch.data.challengeId, "123456");
  await repo.updateAbout({ first_name: "Chanda", nickname: null, date_of_birth: "2004-03-14", city: "Huntsville" });
  await repo.setInterests(["basketball", "guitar"]);
  await repo.setIdentity({ heritage: { level: "country", code: "ZM" }, faith: { level: "denomination", code: "sda" }, consent: true });
  await repo.setAvailability(["tuesday-evening", "thursday-evening", "sunday-afternoon"], ["saturday"]);
  await repo.setPhotos([]);
  await repo.acceptPledge();
  await repo.submitVerification({});
  await repo.runPlacement();
  return repo;
}

const bots = () => {
  const db = useStore.getState().db;
  return db.memberships.filter((m) => m.pod_id === POD && !m.left_at && m.user_id !== db.me).map((m) => m.user_id);
};

async function setup(state: string) {
  const repo = await ensurePlaced();
  const s = () => activeSuggestion(useStore.getState().db, POD)!;
  if (state === "placed") return;
  if (["locked", "checkin", "ballot", "reveal", "vote", "round2"].includes(state)) {
    if (s().status !== "accepted") await repo.rsvp(s().id, "going");
  }
  if (state === "locked") return;
  jumpTo(DEMO.directorJump.at);
  const h = Object.values(useStore.getState().db.hangouts).find((x) => x.pod_id === POD)!;
  if (state === "checkin") return;
  await repo.checkIn(h.id);
  if (state === "ballot") return;
  const b = bots();
  const now = nowISO();
  useStore.getState().commit((d) => {
    for (const u of b.slice(0, 5)) applyCheckIn(d, h.id, u, now);
    applyRunItBack(d, h.id, b[0], "yes", now);
    applyRunItBack(d, h.id, b[1], "yes", now);
    applyRunItBack(d, h.id, b[2], "yes", now);
    applyRunItBack(d, h.id, b[3], "not_sure", now);
    applyRunItBack(d, h.id, b[4], "yes", now);
  });
  await repo.castRunItBack(h.id, "yes");
}

export function PlannerLab() {
  const hydrated = useHydrated();
  const params = useSearchParams();
  const state = params.get("state") ?? "placed";
  const [ready, setReady] = useState(false);
  const repo = useRepo();
  const me = useDb((db) => db.me);
  const s = useDb((db) => activeSuggestion(db, POD));

  useEffect(() => {
    if (!hydrated) return;
    let live = true;
    (async () => {
      if (params.get("reset") === "1") await repo.admin.resetDemo();
      await setup(state);
      if (live) setReady(true);
    })();
    return () => { live = false; };
  }, [hydrated, state, params, repo]);

  function crowdVote() {
    const db = useStore.getState().db;
    const v = Object.values(db.votes).find((x) => x.pod_id === POD && x.status === "open");
    if (!v) return;
    const now = nowISO();
    useStore.getState().commit((d) => { for (const u of bots().slice(0, 3)) applyVote(d, v.id, u, v.option_ids[0], now); });
  }
  function crowdIn() {
    const sug = activeSuggestion(useStore.getState().db, POD);
    if (!sug) return;
    const now = nowISO();
    useStore.getState().commit((d) => { const b = bots().find((u) => !d.rsvps.some((r) => r.hangout_id === sug.id && r.user_id === u)); if (b) applyRsvp(d, sug.id, b, "going", now); });
  }

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto grid max-w-[1240px] gap-8 px-4 py-6 lg:grid-cols-[390px_1fr]">
        <section className="dot-grain -mx-4 min-h-[600px] px-3 py-4 sm:mx-0 sm:rounded-xl sm:border sm:border-border">
          <p className="mb-3 text-overline text-fg-muted">Pinned card · {state}</p>
          {ready && me ? <HangoutCard podId={POD} /> : <p className="text-body-sm text-fg-muted">Setting up…</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={crowdIn}>A member taps I&apos;m in</Button>
            <Button size="sm" variant="secondary" onClick={crowdVote}>3 members vote option 1</Button>
          </div>
        </section>
        <section className="hidden min-w-0 lg:block">
          <p className="mb-3 text-overline text-fg-muted">Desktop chat column (760)</p>
          <div className="dot-grain max-w-[760px] rounded-xl border border-border p-4">{ready && me ? <HangoutCard podId={POD} /> : null}</div>
          {s && (
            <div className="mt-8 max-w-[520px] rounded-card border border-border bg-surface p-5 shadow-sm">
              <PlannerTrace steps={traceRows(s.trace)} replay source={s.source} title="How Pods planned this" />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
