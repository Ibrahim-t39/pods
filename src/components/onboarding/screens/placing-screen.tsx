// B08 Finding your pods → Your pods (C02), B09 filling, B10 failed (V3_SPEC §6.2; PB 7.2; CM 124, 175).
// Beat 2 of the video. "Finding your pods." The logo's three circles breathe (<CirclesLoader size={120}>, MOTION 5.2)
// for 2.4 s at least, so the frame reads on camera. Then "Your pods.": the circles grow into your pods, named,
// interest pods first, your disc where they meet (FoundPods). Each circle is `Shared pod-<id>`, so Your pods picks it
// up on the hand-off. The reveal holds until "Continue" (QA round 1: it used to leave on its own after 2.6 s, too
// fast to read on camera), and beat 3 is a full line in ink: "Only 3 Zambians nearby. You're in Southern African." Placement runs only here, only after the code and the check
// (the repo refuses otherwise).
//   filling  no pod could start yet: "Your pod is filling." / "We'll text you." Never a fake pod (D #5).
//   failed   "Not quite." / "Your answers are kept." · Try again.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Line } from "@/components/brand/line";
import { CirclesLoader } from "@/components/brand/circles-loader";
import { podName as shortName } from "@/components/planner/table/model";
import { Button } from "@/components/ui/button";
import { useHydrated, useMe, useRepo } from "@/lib/db/hooks";
import { useStore } from "@/lib/db/store";
import { myMemberships } from "@/lib/db/selectors";
import { PageSkeleton } from "@/components/shell/store-gate";
import { CONTACT_HREF } from "@/components/legal/contact";
import { FlowStep, GoLink, Sub, useTableSize } from "../flow";
import { FoundPods, SplitTables, type FoundPod } from "../objects";
import { resumeRoute } from "../steps";
import { motion } from "motion/react";
import { ARRIVE } from "@/components/brand/motion";
import { takePendingInvite } from "@/lib/platform/invite";
import { widenedHeadline } from "@/lib/placement/explain";

const MIN_MS = 2400;

export function PlacingScreen() {
  const router = useRouter();
  const hydrated = useHydrated();
  const me = useMe();
  // Read once: placement flips onboarding_step to "done" mid-animation, and this screen must not jump away early.
  const [entry] = useState(() => (hydrated ? (me?.onboarding_step ?? null) : undefined));
  const go = !!me && me.verified;
  useEffect(() => {
    if (!hydrated) return;
    if (!me || !me.verified) router.replace(resumeRoute(me));
    else if (entry === "done") router.replace("/app/home");
  }, [hydrated, me, entry, router]);
  if (!hydrated || !go || entry === "done") return <PageSkeleton />;
  return <Finding initial={me!.first_name.slice(0, 1).toUpperCase()} />;
}

function Finding({ initial }: { initial: string }) {
  const router = useRouter();
  const repo = useRepo();
  const { size, wide } = useTableSize();
  const [state, setState] = useState<"finding" | "placed" | "filling" | "failed">("finding");
  const [found, setFound] = useState<FoundPod[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const started = useRef(false);

  const run = useCallback(async () => {
    setState("finding");
    const t0 = Date.now();
    const already = myMemberships(useStore.getState().db).length > 0;
    const r = already ? null : await repo.runPlacement();
    await new Promise((res) => setTimeout(res, Math.max(0, MIN_MS - (Date.now() - t0))));
    if (r && !r.ok) {
      if (r.error.code === "NOT_VERIFIED") return router.replace("/app/verify");
      return setState("failed");
    }
    const mine = myMemberships(useStore.getState().db);
    const active = mine.filter((m) => m.activation === "active").length;
    if (!active) return setState("filling");
    // A saved invite joins its pod after placement (PLATFORM §F7). A miss (another device, expired) is silent.
    const invite = takePendingInvite();
    if (invite) await repo.redeemInvite(invite).catch(() => null);
    const db = useStore.getState().db;
    // beat 3: the widened pod's line, from this run's own trace ("Only 3 Zambians nearby, so we widened to …")
    // Same source as Your pods (the cached explainer) first, so both screens say the same number; the trace second.
    const runs = db.placementRuns.filter((r) => r.user_id === db.me);
    const wPod = myMemberships(db).map((m) => db.pods[m.pod_id]).find((p) => p?.widened_from?.kind === "group");
    const cached = wPod ? (db.plannerCache as Record<string, { output?: unknown }>)[`${wPod.id}:widen_explainer`] : undefined;
    const body = (cached?.output as { body?: string } | undefined)?.body;
    const m = body?.match(/Only (\d+) (\S+)/);
    const widenedLine = m ? `Only ${m[1]} ${m[2]} nearby` : runs.length ? widenedHeadline(runs[runs.length - 1])?.split(",")[0] : null;
    setNote(wPod && widenedLine ? `${widenedLine}.|${shortName(wPod)}` : null);
    const pods = myMemberships(db)
      .map((m) => db.pods[m.pod_id])
      .filter(Boolean)
      .sort((a, b) => (a.type === b.type ? 0 : a.type === "interest" ? -1 : 1))
      .map((p) => ({
        id: p.id,
        type: p.type === "community" ? ("community" as const) : ("interest" as const),
        hue: p.hue,
        name: p.type === "community" && db.config.flags.maskCommunityInApp ? "Community pod" : shortName(p),
      }));
    setFound(pods);
    setState("placed");
  }, [repo, router]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  const S = wide ? 340 : Math.min(Math.round(size * 0.98), 190);
  const line = state === "failed" ? "Not quite." : state === "filling" ? "Your pod is filling." : state === "placed" ? "Your pods." : "Finding your pods.";

  return (
    <FlowStep
      screen={`placing-${state}`}
      light={state === "failed" ? "paper" : "dawn"}
      back={false}
      label="Finding your pods"
      head={
        <div role="status" aria-live="polite">
          <Line size="lg" className="max-w-[8ch]">
            {line}
          </Line>
          {state === "placed" && note && (
            <motion.p data-widened-note className="pods-ob-note" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ ...ARRIVE, delay: 0.9 }}>
              {note.split("|")[0]} You&apos;re in <b>{note.split("|")[1]}</b>.
            </motion.p>
          )}
          {state === "filling" && <Sub>We&apos;ll text you.</Sub>}
          {state === "failed" && <Sub>Your answers are kept.</Sub>}
        </div>
      }
      object={
        state === "finding" ? (
          <div className="grid place-items-center" style={{ width: S * 1.8, height: S * 1.8 }}>
            <CirclesLoader size={wide ? 200 : 168} label="Finding your pods" />
          </div>
        ) : state === "placed" ? (
          <FoundPods size={S} pods={found} initial={initial} />
        ) : (
          <SplitTables size={S} n={1} initial={initial} failed={state === "failed"} />
        )
      }
      status={
        state === "filling" ? (
          <GoLink href="/app/profile">Add a like</GoLink>
        ) : state === "failed" ? (
          <GoLink href={CONTACT_HREF}>Write to us</GoLink>
        ) : undefined
      }
      action={
        state === "placed" ? (
          <Button size="xl" onClick={() => router.push("/app/home")}>
            Continue
          </Button>
        ) : state === "failed" ? (
          <Button size="xl" onClick={run}>
            Try again
          </Button>
        ) : state === "filling" ? (
          <GoLink href={CONTACT_HREF}>Write to us</GoLink>
        ) : undefined
      }
    />
  );
}
