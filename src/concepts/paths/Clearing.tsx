// The clearing: one lit object on a quiet stage (PB 4.8; AW 04, 42). The day is huge (PB 1.7), place / sky / rain are
// margin captions (PB 1.4; TS 2, 7, 12). Claude's work: four lines bend to one point, ≤ 6 beats, then one line (F7).
// Lock: trails from each seat meet and knot; the ground sets like a pressed print (PB 7.2, 7.3; no confetti, J §1).
// After: dusk surface, a private "Again?" (PB 2.6; CM 127-130). The vote fills circles, never percentages (J §2).
"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO } from "@/config/demo";
import { buildPlannerInput } from "@/lib/planner/adapt";
import { usePlanner, type TraceStep } from "@/lib/planner/client";
import type { Plan, PlannerVenue, Forecast } from "@/lib/planner/types";
import { useClock } from "@/lib/time/clock";
import { person, podActivity, podName, seed, venueShort } from "./data";
import { useSize, type Pt } from "./geometry";
import { Again, Close, Knot, Onward, Place, PullBack, Rain, Sky, Step, Why } from "./icons";
import { Disc, EASE_OUT, EASE_WARP, Paper } from "./Shell";
import { ME, aheadOfYou, usePaths, usePathsReady, type Rec, type Snap } from "./store";
import { dateLong, dayLong, span } from "./time";

const LOCK = 4;
const NOW_FOR_ROUND: Record<number, string> = { 1: DEMO.anchor, 2: "2026-11-12T09:00:00-08:00" };

/** Planner rows as Pods says them: no model names, no internal notes (zero-disclaimer rule). */
const BEAT: Record<string, string> = {
  pod: "Reading the pod",
  context: "How last time went",
  time: "Finding the time",
  venues: "Choosing the place",
  weather: "Checking the sky",
  repeat: "Keeping it fresh",
  draft: "Writing the plan",
  retry: "One more pass",
  validate: "Checking the rules",
};
const BANNED = /demo|pre-run|effort|claude-|opus|sonnet|haiku|model|rule-based|simulat|sample/i;
function beats(steps: TraceStep[]) {
  return steps.slice(-6).map((s) => ({
    id: s.id,
    label: BEAT[s.id] ?? s.label,
    detail: s.detail && !BANNED.test(s.detail) ? s.detail : undefined,
    done: s.status !== "running",
  }));
}

function toSnap(plan: Plan, venue: PlannerVenue, forecast: Forecast | null): Snap {
  const fix = (s: string) => (/[+-]\d\d:\d\d$|Z$/.test(s) ? s : `${s}-08:00`);
  return {
    summary: plan.summary,
    startsAt: fix(plan.starts_at),
    endsAt: fix(plan.ends_at),
    venueId: plan.venue_id,
    venueName: venue.shortName ?? venueShort(plan.venue_id) ?? venue.name,
    address: venue.address,
    rain: plan.rain_plan,
    reason: plan.reason,
    cost: plan.cost,
    sky: forecast ? `${Math.round(forecast.highF)}° · ${forecast.summary.toLowerCase()}` : null,
  };
}

export function ClearingScreen({ podId }: { podId: string }) {
  const ready = usePathsReady();
  const router = useRouter();
  const rec = usePaths((s) => s.recs[podId] ?? null);
  const patch = usePaths((s) => s.patch);
  const promised = usePaths((s) => s.promised);
  const planner = usePlanner();
  const started = useRef<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [why, setWhy] = useState(false);
  const [off, setOff] = useState(false);
  const clock = useClock();

  useEffect(() => {
    if (ready && (!promised || !rec)) router.replace(promised ? "/concepts/paths/home" : "/concepts/paths/begin");
  }, [ready, promised, rec, router]);

  // Run Claude's plan when a clearing has none (round 1 on first entry; round 2 after the vote).
  const plan = useCallback(
    async (round: number) => {
      const key = `${podId}:${round}`;
      if (started.current === key) return;
      started.current = key;
      patch(podId, (r) => ({ ...r, stage: "planning", trace: [] }));
      const input = buildPlannerInput(seed(), podId, { nowISO: NOW_FOR_ROUND[round] ?? DEMO.anchor });
      if (round > 1) input.hangoutNumber = round;
      const out = await planner.run("plan", input, { podLabel: podName(podId), dwellMs: 520 });
      const p = out.plan;
      if (!p) {
        started.current = null;
        patch(podId, (r) => ({ ...r, stage: "new" }));
        return;
      }
      patch(podId, (r) => ({
        ...r,
        stage: "plan",
        plan: toSnap(p.plan, p.venue, p.forecast),
        trace: beats(out.steps).map((b) => ({ label: b.label, detail: b.detail })),
        inn: [],
      }));
      // The people already in arrive one by one (their "I'm in" was before you got here).
      const ahead = aheadOfYou(podId, round);
      ahead.forEach((id, k) =>
        setTimeout(() => patch(podId, (r) => (r.stage === "plan" && !r.inn.includes(id) ? { ...r, inn: [...r.inn, id] } : r)), 700 + k * 650),
      );
    },
    [patch, planner, podId],
  );

  useEffect(() => {
    if (!ready || !rec) return;
    if (rec.stage === "new") void plan(rec.round);
    if (rec.stage === "planning" && started.current !== `${podId}:${rec.round}`) void plan(rec.round);
  }, [ready, rec, plan, podId]);

  // Real clock: once the locked hangout has ended (or the Director jumps), the clearing turns to dusk.
  useEffect(() => {
    if (rec?.stage === "locked" && rec.plan && clock.getTime() > new Date(rec.plan.endsAt).getTime()) {
      patch(podId, (r) => ({ ...r, stage: "after", walks: r.walks + 1 }));
    }
  }, [clock, rec, patch, podId]);

  const back = async () => {
    setLeaving(true);
    await new Promise((r) => setTimeout(r, 380));
    router.push(`/concepts/paths/home?from=${podId}`);
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && !why && !off && void back();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  if (!rec) return <Paper><div style={{ height: "100dvh" }} /></Paper>;

  const imIn = () => {
    patch(podId, (r) => {
      const inn = r.inn.includes(ME) ? r.inn : [...r.inn, ME];
      return { ...r, inn, stage: inn.length >= LOCK ? "locked" : r.stage };
    });
  };
  const vote = (yes: boolean) => {
    if (!yes) {
      patch(podId, (r) => ({ ...r, myVote: "no" }));
      return;
    }
    patch(podId, (r) => ({ ...r, myVote: "yes", stage: "vote", votes: [ME] }));
    const others = aheadOfYou(podId, rec.round);
    others.forEach((id, k) =>
      setTimeout(() => patch(podId, (r) => (r.stage === "vote" && !r.votes.includes(id) ? { ...r, votes: [...r.votes, id] } : r)), 900 + k * 800),
    );
    setTimeout(() => patch(podId, (r) => (r.votes.length >= LOCK ? { ...r, stage: "opening" } : r)), 900 + others.length * 800 + 700);
    setTimeout(() => {
      started.current = null;
      patch(podId, (r) => (r.stage === "opening" ? { ...r, round: r.round + 1, stage: "new", plan: null, inn: [], votes: [], myVote: null, trace: [] } : r));
    }, 900 + others.length * 800 + 2600);
  };

  const dusk = rec.stage === "after" || rec.stage === "vote" || rec.stage === "opening";
  return (
    <Paper mood={dusk ? "dusk" : undefined} hue={rec.hue}>
      <motion.main
        initial={{ opacity: 0, scale: 1.04 }}
        animate={leaving ? { opacity: 0, scale: 0.9 } : { opacity: 1, scale: 1 }}
        transition={{ duration: leaving ? 0.38 : 0.6, ease: EASE_OUT }}
        style={{ position: "relative", height: "100dvh", minHeight: 620, overflow: "hidden" }}
      >
        <Stage rec={rec} steps={planner.steps} />
        <TopBar rec={rec} onBack={back} />
        <AnimatePresence mode="wait">
          {(rec.stage === "new" || rec.stage === "planning") && <Planning key={`p${rec.round}`} rec={rec} steps={planner.steps} />}
          {(rec.stage === "plan" || rec.stage === "locked") && rec.plan && (
            <PlanView key={`v${rec.round}`} rec={rec} onWhy={() => setWhy(true)} onIn={imIn} />
          )}
          {rec.stage === "after" && <AfterView key="after" rec={rec} onVote={vote} onOff={() => setOff(true)} />}
          {(rec.stage === "vote" || rec.stage === "opening") && <VoteView key="vote" rec={rec} />}
        </AnimatePresence>
        <WhySheet open={why} rec={rec} onClose={() => setWhy(false)} />
        <OffSheet open={off} onClose={() => setOff(false)} />
      </motion.main>
    </Paper>
  );
}

/* ───────────────────────── stage: the clearing itself ───────────────────────── */

function geo(w: number, h: number) {
  const desk = w >= 900;
  const c: Pt = desk ? { x: w * 0.7, y: h * 0.5 } : { x: w * 0.8, y: h * 0.4 };
  const r = desk ? Math.min(h * 0.42, 380) : w * 0.6;
  const p: Pt = desk ? { x: c.x - r * 0.12, y: c.y + r * 0.04 } : { x: w * 0.66, y: h * 0.47 };
  return { desk, c, r, p };
}

function Stage({ rec, steps }: { rec: Rec; steps: TraceStep[] }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const locked = rec.stage === "locked";
  return (
    <div ref={ref} style={{ position: "absolute", inset: 0 }} aria-hidden>
      {size && <StageInner w={size.w} h={size.h} rec={rec} locked={locked} steps={steps} />}
    </div>
  );
}

function StageInner({ w, h, rec, locked, steps }: { w: number; h: number; rec: Rec; locked: boolean; steps: TraceStep[] }) {
  const { c, r, p, desk } = geo(w, h);
  const planning = rec.stage === "new" || rec.stage === "planning";
  const opening = rec.stage === "opening";
  const n = planning ? Math.min(4, Math.max(0, steps.length - 1)) : rec.stage === "plan" || locked ? 4 : 0;
  const from: Pt[] = [
    // four people, four directions; none crosses the text column at the bottom-left
    { x: -20, y: h * 0.22 },
    { x: w * 0.42, y: -20 },
    { x: w + 20, y: h * 0.14 },
    { x: w + 20, y: h * 0.82 },
  ];
  // seats around the venue point
  const seatR = desk ? 30 : 22;
  // Four seats around the one point (the place). Others fill first; your seat is the last, marked and breathing.
  const ringR = desk ? r * 0.5 : Math.min(w * 0.27, 108);
  const seats: Pt[] = (desk ? [100, 155, 210, 265] : [115, 165, 215, 265]).map((deg) => {
    const a = (deg * Math.PI) / 180;
    return { x: p.x + Math.cos(a) * ringR, y: p.y + Math.sin(a) * ringR };
  });
  const seatOf = (k: number) => (k === 3 ? (rec.inn.includes(ME) ? ME : undefined) : rec.inn.filter((x) => x !== ME)[k]);
  const showSeats = rec.stage === "plan" || locked;
  const printed = locked;
  const after = rec.stage === "after" || rec.stage === "vote";
  return (
    <>
    <AnimatePresence>
      {printed && (
        <motion.div
          key="print"
          className="pth-print"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8 } }}
          transition={{ duration: 0.55, delay: 1.0, ease: EASE_WARP }}
          style={{ position: "absolute", left: c.x - r, top: c.y - r, width: r * 2, height: r * 2, borderRadius: 999, transformOrigin: "50% 50%" }}
        />
      )}
    </AnimatePresence>
    <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <clipPath id="pth-clear"><circle cx={c.x} cy={c.y} r={r} /></clipPath>
      </defs>
      {/* the clearing: soft ground, or a pressed print when locked */}
      <motion.g
        initial={{ scale: 0.4, opacity: 0 }}
        animate={opening ? { scale: 0.9, opacity: 0 } : { scale: 1, opacity: 1 }}
        transition={{ duration: opening ? 0.9 : 0.7, ease: EASE_WARP }}
        style={{ transformOrigin: `${c.x}px ${c.y}px` }}
      >
        <circle cx={c.x} cy={c.y} r={r} fill="var(--hue)" opacity={locked ? 0 : after ? 0.22 : 0.3} style={{ transition: "opacity 600ms ease", mixBlendMode: "multiply" }} />
        <circle cx={c.x} cy={c.y} r={r * 0.72} fill="var(--hue)" opacity={locked ? 0 : 0.1} style={{ mixBlendMode: "multiply" }} />
        <circle cx={c.x} cy={c.y} r={r + 14} fill="none" stroke="var(--hue)" strokeOpacity={0.35} strokeWidth={1} />
      </motion.g>

      {/* planning: four lines bend toward the one point where free time and travel meet */}
      {(planning || rec.stage === "plan") &&
        from.map((f, k) => {
          const ctrl = { x: (f.x + p.x) / 2 + (k % 2 ? 60 : -60), y: (f.y + p.y) / 2 + (k < 2 ? 80 : -80) };
          const d = `M${f.x},${f.y} Q${ctrl.x},${ctrl.y} ${p.x},${p.y}`;
          return (
            <motion.path
              key={k}
              d={d}
              fill="none"
              stroke="var(--ink)"
              strokeWidth={1}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0.6 }}
              animate={{ pathLength: k < n ? 1 : 0, opacity: rec.stage === "plan" ? 0 : 0.55 }}
              transition={{ pathLength: { duration: 0.9, ease: EASE_OUT }, opacity: { duration: 0.8 } }}
            />
          );
        })}
      {rec.stage === "plan" && <circle cx={p.x} cy={p.y} r={5} fill="var(--ink)" />}
      {planning && (
        <motion.circle cx={p.x} cy={p.y} r={6} fill="var(--ink)" animate={{ scale: [1, 1.6, 1] }} transition={{ duration: 1.4, repeat: Infinity }} style={{ transformOrigin: `${p.x}px ${p.y}px` }} />
      )}

      {/* seats: footstep trails run from each seat to the point; on the 4th they knot */}
      {showSeats &&
        seats.map((s, k) => {
          const who = seatOf(k);
          const mineOpen = k === 3 && !who;
          const mx = (s.x + p.x) / 2, my = (s.y + p.y) / 2;
          const q = { x: mx + (p.y - s.y) * 0.18, y: my - (p.x - s.x) * 0.18 };
          const dots = Array.from({ length: 9 }, (_, j) => {
            const t = (j + 1) / 10;
            const u = 1 - t;
            return { x: u * u * s.x + 2 * u * t * q.x + t * t * p.x, y: u * u * s.y + 2 * u * t * q.y + t * t * p.y };
          });
          return (
            <g key={k}>
              {who &&
                dots.map((dt, j) => (
                  <motion.circle key={j} cx={dt.x} cy={dt.y} r={2.2} fill="var(--ink)" initial={{ opacity: 0 }} animate={{ opacity: 0.75 }} transition={{ delay: 0.05 * j }} />
                ))}
              {mineOpen && (
                <motion.circle cx={s.x} cy={s.y} r={seatR + 6} fill="none" stroke="var(--ink)" strokeWidth={1.25}
                  animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.25, 1] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  style={{ transformOrigin: `${s.x}px ${s.y}px` }} />
              )}
              <circle cx={s.x} cy={s.y} r={seatR} fill={who ? "var(--ink)" : "var(--paper)"} fillOpacity={who ? 1 : 0.7} stroke="var(--ink)" strokeOpacity={who ? 0 : 0.55} strokeWidth={1.5} strokeDasharray={who ? undefined : "3 5"} />
              {mineOpen && (
                <text x={s.x} y={s.y + 4} textAnchor="middle" style={{ font: "500 12px var(--p-sans)", fill: "var(--ink-2)" }}>you</text>
              )}
              {who && (
                <motion.text x={s.x} y={s.y + seatR * 0.36} textAnchor="middle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ font: `600 ${Math.round(seatR * 0.9)}px var(--p-sans)`, fill: "var(--paper)" }}>
                  {who === ME ? usePaths.getState().name.slice(0, 1).toUpperCase() || "Y" : person(who)?.initial}
                </motion.text>
              )}
            </g>
          );
        })}
      {locked && (
        <motion.g initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.75, type: "spring", stiffness: 260, damping: 18 }} style={{ transformOrigin: `${p.x}px ${p.y}px` }}>
          <circle cx={p.x} cy={p.y} r={desk ? 30 : 24} fill="var(--paper)" />
          <g transform={`translate(${p.x - (desk ? 18 : 14)} ${p.y - (desk ? 18 : 14)}) scale(${desk ? 1.5 : 1.17})`} style={{ color: "var(--ink)" }}>
            <Knot />
          </g>
        </motion.g>
      )}
    </svg>
    </>
  );
}

/* ───────────────────────── chrome ───────────────────────── */

function TopBar({ rec, onBack }: { rec: Rec; onBack: () => void }) {
  return (
    <div style={{ position: "absolute", top: "calc(var(--m) - 6px)", left: "calc(var(--m) - 12px)", right: "var(--m)", display: "flex", alignItems: "center", gap: 4, zIndex: 5 }}>
      <button className="pth-icon" aria-label="Pull back to your field" onClick={onBack} data-back><PullBack /></button>
      <div style={{ display: "grid" }}>
        <span className="pth-serif" style={{ fontSize: 24, lineHeight: 1 }}>{podName(rec.id)}{rec.round > 1 ? <span className="pth-serif-i"> #{rec.round}</span> : null}</span>
        <span className="pth-cap">{podActivity(rec.id)}</span>
      </div>
    </div>
  );
}

const textCol = { position: "absolute" as const, left: "var(--m)", zIndex: 4 };

function Planning({ rec, steps }: { rec: Rec; steps: TraceStep[] }) {
  const b = beats(steps);
  const cur = b[b.length - 1];
  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }} style={{ ...textCol, bottom: "max(var(--m), env(safe-area-inset-bottom))", right: "var(--m)", maxWidth: 420, display: "flex", flexDirection: "column-reverse" }} aria-live="polite">
      <p className="pth-cap" style={{ margin: "var(--s4) 0 0", display: "flex", alignItems: "center", gap: 6 }}><Why size={16} /> Claude is planning #{rec.round}</p>
      <AnimatePresence mode="wait">
        <motion.p key={cur?.id ?? "start"} className="pth-serif pth-head" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} style={{ margin: 0, maxWidth: "9ch", minHeight: "1.9em", display: "flex", alignItems: "flex-end" }}>
          {cur?.label ?? "Reading the pod"}
        </motion.p>
      </AnimatePresence>
      <div aria-hidden style={{ display: "flex", gap: 6, margin: "0 0 var(--s4)" }}>
        {Array.from({ length: 6 }, (_, k) => (
          <span key={k} style={{ width: 6, height: 6, borderRadius: 9, background: k < b.length ? "var(--ink)" : "var(--ink-4)", transition: "background-color 300ms" }} />
        ))}
      </div>
    </motion.section>
  );
}

function PlanView({ rec, onWhy, onIn }: { rec: Rec; onWhy: () => void; onIn: () => void }) {
  const pl = rec.plan!;
  const locked = rec.stage === "locked";
  const mine = rec.inn.includes(ME);
  const [cal, setCal] = useState(false);
  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
      <div style={{ ...textCol, top: "clamp(118px, 17vh, 190px)", right: "var(--m)" }}>
        <AnimatePresence>
          {locked && (
            <motion.p className="pth-serif-i" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }} style={{ position: "absolute", bottom: "100%", margin: "0 0 var(--s2)", fontSize: "var(--t-small)" }}>
              It&apos;s on.
            </motion.p>
          )}
        </AnimatePresence>
        <motion.h1 className="pth-serif pth-huge" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, ease: EASE_OUT }} style={{ margin: 0 }}>
          {dayLong(pl.startsAt)}
        </motion.h1>
        <p className="pth-serif pth-small" style={{ margin: "calc(var(--t-huge) * 0.1) 0 0" }}>
          {dateLong(pl.startsAt)} · <span className="pth-tab">{span(pl.startsAt, pl.endsAt)}</span>
        </p>
      </div>
      <dl style={{ ...textCol, bottom: "calc(var(--m) + 52px + var(--s8) + 28px)", margin: 0, display: "grid", gap: "var(--s2)", maxWidth: "min(300px, 58vw)" }}>
        <Caption icon={<Place size={18} />} label="Place">
          <span style={{ color: "var(--ink)", fontWeight: 500 }}>{pl.venueName}</span>
          {locked && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} style={{ display: "block" }}>{pl.address}</motion.span>}
        </Caption>
        {pl.sky && <Caption icon={<Sky size={18} />} label="Sky">{pl.sky}</Caption>}
        <Caption icon={<Rain size={18} />} label="If it rains">{shortRain(pl.rain)}</Caption>
      </dl>
      <div style={{ position: "absolute", left: "calc(var(--m) - 4px)", bottom: "max(var(--m), env(safe-area-inset-bottom))", zIndex: 4, display: "flex", alignItems: "center", height: 52 }}>
        <button className="pth-ghost" onClick={onWhy} data-why style={{ gap: 6 }}><Why size={18} /> Why</button>
      </div>
      <div style={{ position: "absolute", right: "var(--m)", bottom: "max(var(--m), env(safe-area-inset-bottom))", zIndex: 4, display: "grid", justifyItems: "end", gap: "var(--s2)" }}>
        {!locked && <span className="pth-cap pth-tab" aria-live="polite">{rec.inn.length} of {LOCK} in</span>}
        {!locked ? (
          <button className="pth-cta" data-primary onClick={onIn} disabled={mine}>
            I&apos;m in <Step size={20} />
          </button>
        ) : (
          <motion.a
            className="pth-cta"
            data-primary
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6 }}
            href={ics(rec)}
            download={`pods-${rec.id}-${rec.round}.ics`}
            onClick={() => setCal(true)}
            style={{ textDecoration: "none" }}
          >
            {cal ? "Added" : "Add to calendar"} <Onward size={20} />
          </motion.a>
        )}
      </div>
    </motion.section>
  );
}

function Caption({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "18px 1fr", columnGap: 8, alignItems: "start" }}>
      <dt className="pth-sr">{label}</dt>
      <span aria-hidden style={{ color: "var(--ink)", marginTop: 0 }}>{icon}</span>
      <dd className="pth-cap" style={{ margin: 0 }}>{children}</dd>
    </div>
  );
}

function shortRain(s: string) {
  const t = s.replace(/^if it rains,?\s*/i, "").replace(/\.$/, "");
  return t.length > 60 ? `${t.slice(0, 58).replace(/\s+\S*$/, "")}…` : t.charAt(0).toUpperCase() + t.slice(1);
}

function ics(rec: Rec): string {
  const pl = rec.plan!;
  const z = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const body = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pods//EN", "BEGIN:VEVENT",
    `UID:${rec.id}-${rec.round}@pods`, `DTSTAMP:${z(pl.startsAt)}`, `DTSTART:${z(pl.startsAt)}`, `DTEND:${z(pl.endsAt)}`,
    `SUMMARY:${podName(rec.id)} #${rec.round}`, `LOCATION:${pl.venueName}, ${pl.address}`.replace(/,/g, "\\,"), "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
}

function AfterView({ rec, onVote, onOff }: { rec: Rec; onVote: (yes: boolean) => void; onOff: () => void }) {
  const said = rec.myVote === "no";
  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
      <div style={{ ...textCol, top: "clamp(130px, 20vh, 220px)" }}>
        <h1 className="pth-serif pth-huge" style={{ margin: 0 }}>{said ? "Noted." : "Again?"}</h1>
        <p className="pth-serif pth-small" style={{ margin: "calc(var(--t-huge) * 0.16) 0 0", maxWidth: "16ch" }}>
          {said ? "Only you see this." : `${dayLong(rec.plan?.startsAt ?? DEMO.anchor)} at ${rec.plan?.venueName ?? ""}`}
        </p>
      </div>
      <div style={{ position: "absolute", left: "calc(var(--m) - 4px)", bottom: "max(var(--m), env(safe-area-inset-bottom))", zIndex: 4, display: "flex", alignItems: "center", height: 52 }}>
        <button className="pth-ghost" onClick={onOff}>Something off?</button>
      </div>
      {!said && (
        <div style={{ position: "absolute", right: "var(--m)", bottom: "max(var(--m), env(safe-area-inset-bottom))", zIndex: 4, display: "grid", justifyItems: "end", gap: "var(--s2)" }}>
          <button className="pth-ghost" onClick={() => onVote(false)}>Not this one</button>
          <button className="pth-cta" data-primary onClick={() => onVote(true)}>
            Run it back <Again size={20} />
          </button>
        </div>
      )}
    </motion.section>
  );
}

function VoteView({ rec }: { rec: Rec }) {
  const ids = [ME, ...aheadOfYou(rec.id, rec.round)];
  const opening = rec.stage === "opening";
  const name = usePaths((s) => s.name);
  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ ...textCol, top: "clamp(130px, 20vh, 220px)", right: "var(--m)" }} aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.h1 key={opening ? "o" : "v"} className="pth-serif pth-huge" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} style={{ margin: 0 }}>
          {opening ? <>#{rec.round + 1}</> : "Again?"}
        </motion.h1>
      </AnimatePresence>
      <p className="pth-serif pth-small" style={{ margin: "calc(var(--t-huge) * 0.16) 0 var(--s6)" }}>{opening ? "Same path. One step further." : `${rec.votes.length} of ${LOCK} said yes`}</p>
      {opening && <StepFurther round={rec.round} />}
      {!opening && <div style={{ display: "flex", gap: "var(--s4)" }}>
        {ids.map((id) => {
          const yes = rec.votes.includes(id);
          const p = id === ME ? { initial: (name || "Y").slice(0, 1).toUpperCase(), name: "You" } : { initial: person(id)?.initial ?? "", name: person(id)?.name ?? "" };
          return (
            <div key={id} style={{ display: "grid", justifyItems: "center", gap: 4 }}>
              <motion.span animate={{ scale: yes ? 1 : 0.86 }} transition={{ type: "spring", stiffness: 420, damping: 16 }}>
                <Disc initial={yes ? p.initial : ""} size={52} filled={yes} />
              </motion.span>
              <span className="pth-cap">{p.name}</span>
            </div>
          );
        })}
      </div>}
    </motion.section>
  );
}

/** #1 (pressed, done) → the same path → #2 (dashed, opening). Distance along one path, never a ladder (PB 2.5). */
function StepFurther({ round }: { round: number }) {
  const d = "M40,150 C110,150 150,60 250,48";
  return (
    <svg width="300" height="190" viewBox="0 0 300 190" aria-hidden style={{ display: "block", marginTop: "var(--s6)", overflow: "visible" }}>
      <path d={d} fill="none" stroke="var(--ink)" strokeOpacity={0.07} strokeWidth={14} strokeLinecap="round" />
      <motion.path d={d} fill="none" stroke="var(--ink)" strokeWidth={2.5} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: EASE_OUT }} />
      <circle cx={40} cy={150} r={30} fill="var(--hue)" />
      <text x={40} y={159} textAnchor="middle" style={{ font: "400 26px var(--p-serif)", fill: "var(--ink)" }}>#{round}</text>
      <motion.g initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9, type: "spring", stiffness: 260, damping: 18 }} style={{ transformOrigin: "250px 48px" }}>
        <circle cx={250} cy={48} r={40} fill="var(--paper)" stroke="var(--hue)" strokeWidth={2} strokeDasharray="4 6" />
        <text x={250} y={59} textAnchor="middle" style={{ font: "400 32px var(--p-serif)", fill: "var(--ink)" }}>#{round + 1}</text>
      </motion.g>
    </svg>
  );
}

/* ───────────────────────── sheets ───────────────────────── */

function Sheet({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgb(30 25 21 / .28)", zIndex: 30 }} />
          <motion.div
            role="dialog"
            aria-modal
            aria-label={label}
            className="pth-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 31, padding: "var(--s6) var(--m) calc(var(--m) + env(safe-area-inset-bottom))", maxWidth: 560, margin: "0 auto" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>{children}</div>
              <button className="pth-icon" aria-label="Close" onClick={onClose} style={{ marginRight: -12, marginTop: -8 }}><Close /></button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function WhySheet({ open, rec, onClose }: { open: boolean; rec: Rec; onClose: () => void }) {
  const tidy = (t: string) => t.replace(/\s*→\s*/g, ", so ").replace(/\s*·\s*/g, ", ");
  const extra = rec.trace.map((t) => t.detail).filter((d): d is string => !!d && !d.includes(podName(rec.id)) && !/unavailable/i.test(d)).map(tidy);
  const lines = [rec.plan?.reason, ...extra].filter(Boolean).slice(0, 3) as string[];
  return (
    <Sheet open={open} onClose={onClose} label="Why this plan">
      <p className="pth-cap" style={{ margin: 0, display: "flex", gap: 6, alignItems: "center" }}><Why size={16} /> Planned by Claude</p>
      <ol style={{ margin: "var(--s4) 0 0", padding: 0, listStyle: "none", display: "grid", gap: "var(--s4)" }}>
        {lines.map((l, k) => (
          <li key={k} className={k === 0 ? "pth-serif pth-small" : "pth-cap"} style={k === 0 ? { maxWidth: "24ch" } : undefined}>{l}</li>
        ))}
      </ol>
    </Sheet>
  );
}

function OffSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [sent, setSent] = useState(false);
  return (
    <Sheet open={open} onClose={() => { onClose(); setTimeout(() => setSent(false), 400); }} label="Tell us privately">
      {sent ? (
        <p className="pth-serif pth-small" style={{ margin: 0 }}>Thanks. We&apos;ll look today.</p>
      ) : (
        <>
          <p className="pth-serif pth-small" style={{ margin: 0 }}>Tell us privately.</p>
          <div style={{ display: "grid", marginTop: "var(--s4)", marginLeft: -4 }}>
            <button className="pth-ghost" onClick={() => setSent(true)}>Someone made me uneasy</button>
            <button className="pth-ghost" onClick={() => setSent(true)}>Something else</button>
          </div>
        </>
      )}
    </Sheet>
  );
}
