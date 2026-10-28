// Home is a field seen from above (PB 2.4, 4.1). You stand bottom-left; each pod is a clearing joined to you by a path
// that deepens with every hangout held (never a number, never fades). Tap a clearing: the camera flies into it (SF 03).
// No list, no tab bar, no cards (PB 8). First visit: clearings fade up and paths draw toward you (SF 01, 07, 19).
"use client";

import { motion, useAnimationControls } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { podName } from "./data";
import { edge, trail, useSize, wear, type Pt } from "./geometry";
import { EASE_WARP, Logo, Paper } from "./Shell";
import { usePaths, usePathsReady, type Rec } from "./store";
import { whenShort } from "./time";

interface Spot { c: Pt; r: number }

function layout(w: number, h: number, n: number): { you: Pt; spots: Spot[] } {
  const desk = w >= 900;
  const you: Pt = desk ? { x: 96, y: h - 110 } : { x: 44, y: h - 128 };
  const spots: Spot[] = desk
    ? [
        { c: { x: w * 0.52, y: h * 0.33 }, r: 118 },
        { c: { x: w * 0.82, y: h * 0.6 }, r: 100 },
        { c: { x: w * 0.34, y: h * 0.8 }, r: 64 },
      ]
    : [
        { c: { x: w * 0.68, y: h * 0.31 }, r: 70 },
        { c: { x: w * 0.74, y: h * 0.62 }, r: 56 },
        // third clearing sits low and close: its path is short and never crosses the others or their labels
        { c: { x: w * 0.42, y: h * 0.82 }, r: 40 },
      ];
  return { you, spots: spots.slice(0, n) };
}

/** Faint marks in the grass so the paper reads as ground seen from above (deterministic, no geography). */
function marks(w: number, h: number) {
  const out: { x: number; y: number; a: number }[] = [];
  let s = 17;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const n = Math.round((w * h) / 9000);
  for (let i = 0; i < n; i++) out.push({ x: rnd() * w, y: rnd() * h, a: -30 + rnd() * 60 });
  return out;
}

export function Home() {
  const ready = usePathsReady();
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from");
  const s = usePaths();
  const [ref, size] = useSize<HTMLDivElement>();
  const cam = useAnimationControls();
  const [going, setGoing] = useState<string | null>(null);
  const firstVisit = ready && s.promised && !s.arrived;

  useEffect(() => {
    if (ready && !s.promised) router.replace("/concepts/paths/begin");
  }, [ready, s.promised, router]);

  const geo = useMemo(() => (size ? layout(size.w, size.h, s.pods.length) : null), [size, s.pods.length]);

  // Returning from a clearing: start zoomed in on it and pull back (the reverse of the warp).
  useEffect(() => {
    if (!geo || !from) return;
    const i = s.pods.indexOf(from);
    if (i < 0) return;
    const sp = geo.spots[i];
    void cam.set({ scale: 5, originX: `${sp.c.x}px`, originY: `${sp.c.y}px`, opacity: 0.4 } as never);
    void cam.start({ scale: 1, opacity: 1, transition: { duration: 0.7, ease: EASE_WARP } });
    router.replace("/concepts/paths/home", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo, from]);

  const enter = async (id: string, sp: Spot) => {
    if (going) return;
    setGoing(id);
    if (!s.arrived) s.set({ arrived: true });
    router.prefetch(`/concepts/paths/pod/${id}`);
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      await cam.start({ scale: 6, originX: `${sp.c.x}px`, originY: `${sp.c.y}px`, transition: { duration: 0.65, ease: EASE_WARP } } as never);
    }
    router.push(`/concepts/paths/pod/${id}`);
  };

  // The one next step: the first pod that needs you pulses.
  const nextId = s.pods.find((id) => ["new", "plan", "after"].includes(s.recs[id]?.stage ?? "new")) ?? null;
  const field = geo && size ? marks(size.w, size.h) : [];

  return (
    <Paper mood={s.pods.some((id) => s.recs[id]?.stage === "after") ? "dusk" : undefined}>
      <main ref={ref} style={{ position: "relative", height: "100dvh", minHeight: 600, overflow: "hidden" }}>
        <header style={{ position: "absolute", top: "calc(var(--m) - 6px)", left: "var(--m)", zIndex: 4 }}>
          <Logo size={26} href="/concepts/paths/home" />
        </header>
        {firstVisit && (
          <motion.h1
            className="pth-serif pth-head"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.7 }}
            style={{ position: "absolute", left: "var(--m)", top: "clamp(84px, 11vh, 120px)", margin: 0, zIndex: 3, maxWidth: "9ch" }}
          >
            They saved you a seat.
          </motion.h1>
        )}
        {geo && size && (
          <motion.div animate={cam} style={{ position: "absolute", inset: 0 }}>
            <svg width={size.w} height={size.h} style={{ position: "absolute", inset: 0 }} aria-hidden>
              {field.map((m, k) => (
                <line key={k} x1={m.x} y1={m.y} x2={m.x + 5 * Math.cos((m.a * Math.PI) / 180)} y2={m.y - 5 * Math.sin((m.a * Math.PI) / 180) - 3} stroke="var(--ink)" strokeOpacity={0.09} strokeWidth={1} strokeLinecap="round" />
              ))}
              {s.pods.map((id, i) => {
                const rec = s.recs[id];
                const sp = geo.spots[i];
                if (!rec || !sp) return null;
                return <Trail key={id} you={geo.you} sp={sp} rec={rec} i={i} reveal={firstVisit} />;
              })}
              <circle cx={geo.you.x} cy={geo.you.y} r={24} fill="var(--ink)" />
              <text x={geo.you.x} y={geo.you.y + 7} textAnchor="middle" style={{ font: "600 19px var(--p-sans)", fill: "var(--paper)" }}>
                {(s.name || " ").slice(0, 1).toUpperCase()}
              </text>
            </svg>
            {s.pods.map((id, i) => {
              const rec = s.recs[id];
              const sp = geo.spots[i];
              if (!rec || !sp) return null;
              return <Clearing key={id} rec={rec} sp={sp} i={i} reveal={firstVisit} pulse={id === nextId} onEnter={() => enter(id, sp)} desk={size.w >= 900} />;
            })}
          </motion.div>
        )}
      </main>
    </Paper>
  );
}

function Trail({ you, sp, rec, i, reveal }: { you: Pt; sp: Spot; rec: Rec; i: number; reveal: boolean }) {
  const d = trail(you, edge(you, sp.c, sp.r + 8), [0.22, -0.2, 0.1][i] ?? 0.15);
  const wr = wear(rec.walks);
  const delay = reveal ? 1000 + i * 260 : 0;
  return (
    <g>
      {wr.halo > 0 && <path d={d} fill="none" stroke="var(--ink)" strokeOpacity={0.06} strokeWidth={wr.halo} strokeLinecap="round" />}
      <path
        d={d}
        fill="none"
        stroke="var(--ink)"
        strokeOpacity={wr.alpha}
        strokeWidth={wr.w}
        strokeDasharray={wr.dash}
        strokeLinecap="round"
        className={reveal ? "pth-fade" : undefined}
        style={{ ["--delay" as string]: `${delay}ms`, transition: "stroke-width 900ms ease" }}
      />
    </g>
  );
}

function Clearing({ rec, sp, i, reveal, pulse, onEnter, desk }: { rec: Rec; sp: Spot; i: number; reveal: boolean; pulse: boolean; onEnter: () => void; desk: boolean }) {
  const name = podName(rec.id);
  const status = rec.stage === "new" ? (pulse ? "Your seat" : "") : statusOf(rec);
  const locked = rec.stage === "locked";
  return (
    <motion.button
      onClick={onEnter}
      data-hue={rec.hue}
      data-pod={rec.id}
      aria-label={`${name}${status ? `, ${status}` : ""}`}
      initial={reveal ? { opacity: 0, scale: 0.6 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: reveal ? 0.25 + i * 0.28 : 0, duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
      style={{ position: "absolute", left: sp.c.x - sp.r, top: sp.c.y - sp.r, width: sp.r * 2, height: sp.r * 2, padding: 0, border: 0, background: "none", cursor: "pointer", borderRadius: 999 }}
    >
      <span
        className={locked ? "pth-print" : undefined}
        style={{ position: "absolute", inset: 0, borderRadius: 999, background: locked ? undefined : "var(--hue)", opacity: locked ? 1 : 0.88, mixBlendMode: locked ? undefined : "multiply" }}
      />
      {pulse && (
        <motion.span
          aria-hidden
          animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", inset: -6, borderRadius: 999, border: "1.5px solid var(--hue)" }}
        />
      )}
      <span
        style={{
          // Label starts at the clearing's centre line so the path (arriving bottom-left) never crosses it.
          position: "absolute", left: "46%", top: "100%", marginTop: 10, textAlign: "left", whiteSpace: "nowrap",
          display: "grid", gap: 2, color: "var(--ink)",
        }}
      >
        <span className="pth-serif" style={{ fontSize: desk ? 30 : 24, lineHeight: 1 }}>{name}</span>
        {status && <span className="pth-cap">{status}</span>}
      </span>
      {rec.round > 1 && (
        <span className="pth-serif" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: sp.r * 0.8, color: "var(--ink)", lineHeight: 1 }}>
          #{rec.round}
        </span>
      )}
    </motion.button>
  );
}

function statusOf(r: Rec): string {
  switch (r.stage) {
    case "new":
      return "New";
    case "planning":
      return "Planning";
    case "plan":
      return r.plan ? `${whenShort(r.plan.startsAt)} · ${r.inn.length} of 4` : "";
    case "locked":
      return r.plan ? `${whenShort(r.plan.startsAt)} · it's on` : "";
    case "after":
      return "Again?";
    case "vote":
    case "opening":
      return "Opening #2";
  }
}
