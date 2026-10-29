// The landing (/), v2: a film in eight chapters, played by scroll alone (PODS/v3/landing-v2/NOTES.md).
// Arrival -> Fit -> The plan -> I'm in -> Saturday -> Repeat -> Safe by design -> Close. Each chapter is a sticky
// 100svh stage inside a taller section; every transform is a function of scroll progress (motion/react useScroll).
// Nothing inside the story is clickable: the nav (logo, Try it, Sign in, Get started) and the closing Get started are
// the only links. The playable demo lives at /try. A fixed sky behind everything moves dusk -> night -> morning -> day ->
// evening with the page. Reduced motion: each chapter is one still viewport, finished.
"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "motion/react";
import { Logo } from "@/components/brand/logo";
import { PodSphere } from "@/components/brand/pod-sphere";
import { useCalmMotion } from "@/components/brand/motion";
import { TOPICS, VENUE_BY_ID } from "@/data/plans";
import "./film.css";

export const START = "/app";
export const SIGN_IN = "/app/welcome";

/* ── the timeline: section heights in svh; the page scrolls (total - 100) svh ─────────────────────────────── */
// sections overlap by one viewport (margin-top -100svh), so each chapter pins the moment the last one lets go
const H = [240, 340, 340, 260, 260, 360, 240, 220] as const;
const S = H.reduce<number[]>((a, h, i) => [...a, i ? a[i - 1] + H[i - 1] - 100 : 0], []);
const L = S[H.length - 1] + H[H.length - 1] - 100;
/** page progress (0-1) at chapter i, local progress p */
const g = (i: number, p: number) => (S[i] + p * (H[i] - 100)) / L;
const CHAPTERS = ["Arrival", "Fit", "The plan", "I'm in", "Saturday", "Repeat", "Safe", "Pods"];

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/* the plan, from the seed so page and app agree */
const BB = TOPICS.basketball;
const PLACE = VENUE_BY_ID[BB.venue]?.short_name ?? "The park courts";
const RAIN = (BB.rainVenue && VENUE_BY_ID[BB.rainVenue]?.short_name) || "Indoors";

export function Film() {
  const calm = useCalmMotion();
  return (
    <div className="fm" data-calm={calm ? "" : undefined}>
      <Sky />
      <FilmNav />
      <main id="main">
        <Arrival />
        <Fit />
        <Plan />
        <ImIn />
        <Saturday />
        <Repeat />
        <Safe />
        <Close />
      </main>
    </div>
  );
}

/* ── nav: the only chrome; its ink follows the sky ─────────────────────────────────────────────────────────── */
function useTone() {
  const { scrollYProgress } = useScroll();
  const [tone, setTone] = useState<"dark" | "light">("dark");
  const [ch, setCh] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setTone(v > g(4, 0.3) && v < g(6, 1) + 0.01 ? "light" : "dark");
    let c = 0;
    for (let i = 0; i < H.length; i++) if (v >= g(i, 0) - 0.004) c = i;
    setCh(c);
  });
  return { tone, ch };
}

export function FilmNav({ tone: forced }: { tone?: "dark" | "light" }) {
  const { tone, ch } = useTone();
  const t = forced ?? tone;
  return (
    <>
      <header className="fm-nav" data-tone={t}>
        <Link href="/" aria-label="Pods, home" className="fm-nav-logo">
          <Logo variant="horizontal" onDark={t === "dark"} title="" className="h-[22px] w-auto lg:h-6" />
        </Link>
        <nav aria-label="Site" className="fm-nav-end">
          <Link href="/try" className="fm-nav-a">
            Try it
          </Link>
          <Link href={SIGN_IN} className="fm-nav-a">
            Sign in
          </Link>
          <Link href={START} className="fm-nav-pill">
            Get started
          </Link>
        </nav>
      </header>
      {!forced && (
        <p className="fm-chapter" data-tone={t} aria-hidden>
          <span>{String(ch + 1).padStart(2, "0")}</span>
          <i />
          {CHAPTERS[ch]}
        </p>
      )}
    </>
  );
}

/* ── the sky: stacked light cross-faded by page progress, three drifting pools, grain, floor fog ─────────── */
function Sky() {
  const { scrollYProgress: v } = useScroll();
  const night = useTransform(v, [g(1, 0.5), g(2, 0.1), g(4, 0.05), g(4, 0.35)], [0, 1, 1, 0]);
  const morning = useTransform(v, [g(4, 0.02), g(4, 0.35), g(5, 0.05), g(5, 0.35)], [0, 1, 1, 0]);
  const day = useTransform(v, [g(5, 0.05), g(5, 0.35), g(6, 1), g(7, 0.4)], [0, 1, 1, 0]);
  const evening = useTransform(v, [g(6, 1), g(7, 0.4)], [0, 1]);
  const p1 = useTransform(v, [0, 1], ["0vh", "-40vh"]);
  const p2 = useTransform(v, [0, 1], ["10vh", "-70vh"]);
  const p3 = useTransform(v, [0, 1], ["-5vw", "25vw"]);
  return (
    <div className="fm-sky" aria-hidden>
      <div className="fm-sky-l" data-sky="dusk" />
      <motion.div className="fm-sky-l" data-sky="night" style={{ opacity: night }} />
      <motion.div className="fm-sky-l" data-sky="morning" style={{ opacity: morning }} />
      <motion.div className="fm-sky-l" data-sky="day" style={{ opacity: day }} />
      <motion.div className="fm-sky-l" data-sky="evening" style={{ opacity: evening }} />
      <motion.i className="fm-pool" data-h="ember" style={{ y: p1 }} />
      <motion.i className="fm-pool" data-h="signal" style={{ y: p2 }} />
      <motion.i className="fm-pool" data-h="grove" style={{ x: p3 }} />
      <i className="fm-fog" />
      <i className="fm-grain" />
    </div>
  );
}

/* ── a chapter: tall section, sticky stage, progress 0-1 (or the still value when motion is calm) ─────────── */
function useChapter(still: number): [RefObject<HTMLElement | null>, MotionValue<number>] {
  const ref = useRef<HTMLElement>(null);
  const calm = useCalmMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const p = useTransform(scrollYProgress, (x) => (calm ? still : x));
  return [ref, p];
}

function Chapter({ i, sref, label, tone, sky, children, className }: { i: number; sref: RefObject<HTMLElement | null>; label: string; tone: "dark" | "light"; sky: string; children: ReactNode; className?: string }) {
  return (
    <section ref={sref} className={`fm-ch ${className ?? ""}`} style={{ "--h": `${H[i]}svh` } as CSSProperties} aria-label={label}>
      <div className="fm-stage" data-tone={tone} data-sky={sky}>
        {children}
      </div>
    </section>
  );
}

/** a headline that fades up in [a,b] and out in [c,d] */
function Line({ p, at, children, className, as = "h2" }: { p: MotionValue<number>; at: [number, number, number, number]; children: ReactNode; className?: string; as?: "h1" | "h2" | "p" }) {
  const o = useTransform(p, at, [0, 1, 1, 0]);
  const y = useTransform(p, at, [28, 0, 0, -28]);
  const M = as === "h1" ? motion.h1 : as === "p" ? motion.p : motion.h2;
  return (
    <M className={className} style={{ opacity: o, y }}>
      {children}
    </M>
  );
}

/* ── 1 · Arrival: dusk over a city that isn't yours yet; one dot ───────────────────────────────────────────── */
function city(seed: number, n: number, minH: number, maxH: number, win: number) {
  const r = rng(seed);
  const out: { x: number; w: number; h: number; wins: { x: number; y: number }[] }[] = [];
  let x = -20;
  for (let k = 0; k < n && x < 1460; k++) {
    const w = 40 + r() * 70;
    const h = minH + r() * (maxH - minH);
    const wins: { x: number; y: number }[] = [];
    for (let j = 0; j < win; j++) if (r() > 0.55) wins.push({ x: x + 6 + r() * (w - 14), y: 400 - h + 10 + r() * (h - 24) });
    out.push({ x, w, h, wins });
    x += w + r() * 6;
  }
  return out;
}
const FAR = city(7, 40, 90, 230, 3);
const MID = city(19, 34, 60, 170, 4);
const NEAR = city(31, 26, 30, 110, 2);

function Skyline({ b, tone }: { b: ReturnType<typeof city>; tone: "far" | "mid" | "near" }) {
  return (
    <svg viewBox="0 0 1440 400" preserveAspectRatio="xMidYMax slice" className="fm-city-svg" data-l={tone}>
      {b.map((s, k) => (
        <g key={k}>
          <rect x={s.x} y={400 - s.h} width={s.w} height={s.h} rx={tone === "near" ? 6 : 3} />
          {s.wins.map((w, j) => (
            <rect key={j} className="fm-win" x={w.x} y={w.y} width={tone === "far" ? 3 : 5} height={tone === "far" ? 4 : 6} rx={1} />
          ))}
        </g>
      ))}
    </svg>
  );
}

function Arrival() {
  const [ref, p] = useChapter(0.2);
  const far = useTransform(p, [0, 1], [1, 1.12]);
  const mid = useTransform(p, [0, 1], [1, 1.3]);
  const near = useTransform(p, [0, 1], [1, 1.7]);
  const nearY = useTransform(p, [0, 1], ["0%", "18%"]);
  const nearO = useTransform(p, [0.5, 0.9], [1, 0]);
  const cityO = useTransform(p, [0.75, 1], [1, 0]);
  const sun = useTransform(p, [0, 1], ["0%", "60%"]);
  const sunO = useTransform(p, [0.6, 1], [1, 0]);
  const dot = useTransform(p, [0, 0.7, 1], [1, 1.25, 2.2]);
  const dotO = useTransform(p, [0.8, 0.97], [1, 0]);
  const hint = useTransform(p, [0, 0.12], [1, 0]);
  return (
    <Chapter i={0} sref={ref} label="Arrival" tone="dark" sky="dusk" className="fm-arrival">
      <motion.i className="fm-sun" style={{ y: sun, opacity: sunO }} aria-hidden />
      <motion.div className="fm-city" style={{ opacity: cityO }} aria-hidden>
        <motion.div className="fm-city-l" style={{ scale: far }}>
          <Skyline b={FAR} tone="far" />
        </motion.div>
        <motion.div className="fm-city-l" style={{ scale: mid }}>
          <Skyline b={MID} tone="mid" />
        </motion.div>
        <motion.div className="fm-city-l" style={{ scale: near, y: nearY, opacity: nearO }}>
          <Skyline b={NEAR} tone="near" />
        </motion.div>
      </motion.div>
      <div className="fm-copy fm-copy-top">
        <Line p={p} at={[-1, 0, 0.55, 0.8]} as="h1" className="fm-h1">
          New city.
          <br />
          <span className="fm-dim">Nobody to call yet.</span>
        </Line>
      </div>
      <motion.div className="fm-you" style={{ scale: dot, opacity: dotO }} aria-hidden>
        <i className="fm-bead" />
      </motion.div>
      <motion.p className="fm-hint" style={{ opacity: hint }} aria-hidden>
        <i />
        Scroll
      </motion.p>
    </Chapter>
  );
}

/* ── 2 · Fit: people drift in from depth, the ones who fit pull together, three pods become the mark ────── */
type Hue = "ember" | "signal" | "grove";
const HEX: Record<Hue, string> = { ember: "var(--pods-ember)", signal: "var(--pods-signal)", grove: "var(--pods-grove)" };
/** PodSphere's hue keys are slot names; these give the logo colour */
const SPHERE: Record<Hue, "signal" | "ember" | "grove"> = { ember: "signal", signal: "ember", grove: "grove" };
/** the mark's circle centres relative to its centre, in units of the circle radius (logo-geometry.ts) */
const MARK: Record<Hue, [number, number]> = { ember: [0, -0.78], signal: [-0.74, 0.39], grove: [0.74, 0.39] };
const TAGS: Record<Hue, string> = { ember: "Pickup hoops", signal: "Live music", grove: "Trail walks" };

const r2 = rng(5);
const CROWD = Array.from({ length: 34 }, (_, k) => {
  const fit: Hue | null = k < 18 ? (["ember", "signal", "grove"] as Hue[])[k % 3] : null;
  return { k, fit, x: (r2() - 0.5) * 120, y: (r2() - 0.5) * 80, z: -200 - r2() * 1400, s: 0.7 + r2() * 0.6, jx: (r2() - 0.5) * 2, jy: (r2() - 0.5) * 2 };
});

function Person({ p, d, vw, vh, r }: { p: MotionValue<number>; d: (typeof CROWD)[number]; vw: number; vh: number; r: number }) {
  const z = useTransform(p, [0, 0.4], [d.z, d.z + 900]);
  const c = d.fit ? MARK[d.fit] : [0, 0];
  const x = useTransform(p, [0.3, 0.62], [(d.x * vw) / 100, d.fit ? c[0] * r + d.jx * r * 0.35 : (d.x * 1.8 * vw) / 100]);
  const y = useTransform(p, [0.3, 0.62], [(d.y * vh) / 100, d.fit ? c[1] * r + d.jy * r * 0.35 : (d.y * 1.8 * vh) / 100]);
  const o = useTransform(p, d.fit ? [0, 0.12, 0.62, 0.7] : [0, 0.12, 0.3, 0.45], [0, 1, 1, 0]);
  const tint = useTransform(p, [0.25, 0.4], [0, 1]);
  return (
    <motion.i className="fm-person" style={{ x, y, z, opacity: o, scale: d.s }}>
      {d.fit && <motion.b style={{ opacity: tint, borderColor: HEX[d.fit] }} />}
    </motion.i>
  );
}

/** three glossy pods; t 0 = apart and far, 1 = the mark */
function Trio({ p, at, size, people }: { p: MotionValue<number>; at: [number, number]; size: number; people: number }) {
  return (
    <div className="fm-trio" style={{ "--ts": `${size}px` } as CSSProperties} aria-hidden>
      {(["signal", "grove", "ember"] as Hue[]).map((h) => (
        <TrioSphere key={h} h={h} p={p} at={at} size={size} people={people} />
      ))}
    </div>
  );
}
function TrioSphere({ h, p, at, size, people }: { h: Hue; p: MotionValue<number>; at: [number, number]; size: number; people: number }) {
  const r = size / 2;
  const [mx, my] = MARK[h];
  const x = useTransform(p, at, [mx * r * 3.2, mx * r]);
  // the top sphere starts closer in, so it never crosses the headline above
  const y = useTransform(p, at, [my * r * (my < 0 ? 1.7 : 3.2), my * r]);
  const z = useTransform(p, at, [-500, 0]);
  const s = useTransform(p, [at[0] - 0.1, at[0] + 0.05], [0.2, 1]);
  const o = useTransform(p, [at[0] - 0.1, at[0]], [0, 1]);
  return (
    <motion.div className="fm-trio-s" style={{ x, y, z, scale: s, opacity: o }}>
      <PodSphere hue={SPHERE[h]} people={people} inCount={people} you={false} size={size} />
    </motion.div>
  );
}

function Tag({ p, h, r }: { p: MotionValue<number>; h: Hue; r: number }) {
  const o = useTransform(p, [0.4, 0.48, 0.58, 0.64], [0, 1, 1, 0]);
  const [mx, my] = MARK[h];
  // above the top cluster; outside-left / outside-right of the lower two
  const left = `calc(50% + ${mx * r * 1.35}px)`;
  const top = `calc(52% + ${my < 0 ? my * r - r * 1.05 : my * r + r * 1.25}px)`;
  const tr = mx < 0 ? "-80% -50%" : mx > 0 ? "-20% -50%" : "-50% -50%";
  return (
    <motion.span className="fm-tag" style={{ opacity: o, left, top, translate: tr }}>
      <i style={{ background: HEX[h] }} />
      {TAGS[h]}
    </motion.span>
  );
}

function Fit() {
  const [ref, p] = useChapter(0.9);
  const isPhone = useIsPhone();
  const { w, h } = useViewport();
  const size = isPhone ? 120 : 190;
  const tilt = useTransform(p, [0, 1], [8, -4]);
  const out = useTransform(p, [0.93, 1], [1, 0]);
  const outZ = useTransform(p, [0.93, 1], [0, 300]);
  return (
    <Chapter i={1} sref={ref} label="Fit" tone="dark" sky="night" className="fm-fit">
      <motion.div className="fm-space" style={{ rotateX: tilt, opacity: out, z: outZ }} aria-hidden>
        {CROWD.map((d) => (
          <Person key={d.k} p={p} d={d} vw={w} vh={h} r={size / 2} />
        ))}
        <Trio p={p} at={[0.62, 0.86]} size={size} people={3} />
      </motion.div>
      {(["ember", "signal", "grove"] as Hue[]).map((h) => (
        <Tag key={h} p={p} h={h} r={size / 2} />
      ))}
      <div className="fm-copy fm-copy-top">
        <Line p={p} at={[0.04, 0.14, 0.9, 0.99]} className="fm-h2">
          Not more people.
          <br />
          <span className="fm-dim">The right few.</span>
        </Line>
      </div>
      <div className="fm-copy fm-copy-bottom">
        <Line p={p} at={[0.8, 0.86, 0.92, 0.99]} as="p" className="fm-cap">
          A pod: 6 to 10 people near you, picked for fit.
        </Line>
      </div>
    </Chapter>
  );
}

/* ── 3 · The plan: a phone rises in 3D; the AI fills the plan as you scroll ───────────────────────────────── */
const PLAN: { k: string; v: string; s?: string }[] = [
  { k: "What", v: "Pickup basketball", s: "Rotating 5-on-5" },
  { k: "When", v: "Sat 10am", s: "7 of 8 are free" },
  { k: "Where", v: PLACE, s: "Public courts, daylight" },
  { k: "Bring", v: BB.bring.slice(0, 2).join(" · ") },
  { k: "If it rains", v: RAIN },
];

function PlanRow({ p, i, row }: { p: MotionValue<number>; i: number; row: (typeof PLAN)[number] }) {
  const a = 0.28 + i * 0.1;
  const o = useTransform(p, [a, a + 0.06], [0, 1]);
  const y = useTransform(p, [a, a + 0.06], [10, 0]);
  const w = useTransform(p, [a - 0.04, a, a + 0.06], ["0%", "100%", "100%"]);
  const wo = useTransform(p, [a - 0.04, a, a + 0.07], [0, 1, 0]);
  return (
    <li className="fm-row">
      <motion.i className="fm-row-scan" style={{ width: w, opacity: wo }} />
      <motion.div style={{ opacity: o, y }}>
        <small>{row.k}</small>
        <b>{row.v}</b>
        {row.s && <span>{row.s}</span>}
      </motion.div>
    </li>
  );
}

function Plan() {
  const [ref, p] = useChapter(0.85);
  const y = useTransform(p, [0, 0.25, 0.9, 1], ["70vh", "0vh", "0vh", "-8vh"]);
  const rx = useTransform(p, [0, 0.25, 0.9, 1], [52, 12, 4, -30]);
  const ry = useTransform(p, [0, 0.25, 0.9], [-28, -16, -6]);
  const rz = useTransform(p, [0, 0.25], [8, 2]);
  const ph = useTransform(p, [0, 0.08, 0.9, 1], [0, 1, 1, 0]);
  const orbO = useTransform(p, [0, 0.15, 0.88, 1], [0, 1, 1, 0]);
  const thinking = useTransform(p, [0.2, 0.26, 0.74, 0.78], [0, 1, 1, 0]);
  const ready = useTransform(p, [0.76, 0.8], [0, 1]);
  const shadow = useTransform(p, [0, 0.25, 0.9, 1], [0, 1, 1, 0]);
  const orbA = useTransform(p, [0, 1], ["20vh", "-30vh"]);
  const orbB = useTransform(p, [0, 1], ["40vh", "-10vh"]);
  return (
    <Chapter i={2} sref={ref} label="The plan" tone="dark" sky="night" className="fm-plan">
      <motion.i className="fm-orb" data-o="a" style={{ y: orbA, opacity: orbO }} aria-hidden>
        <PodSphere hue="ember" people={8} inCount={4} you={false} size={110} />
      </motion.i>
      <motion.i className="fm-orb" data-o="b" style={{ y: orbB, opacity: orbO }} aria-hidden>
        <PodSphere hue="grove" people={6} inCount={2} you={false} size={64} />
      </motion.i>
      <div className="fm-plan-grid">
        <div className="fm-copy fm-plan-copy">
          <Line p={p} at={[0.1, 0.22, 0.9, 0.99]} className="fm-h2">
            The AI plans it.
            <br />
            <span className="fm-dim">You just say yes.</span>
          </Line>
        </div>
        <div className="fm-phone-wrap" aria-hidden>
          <motion.i className="fm-phone-shadow" style={{ opacity: shadow }} />
          <motion.div className="fm-phone" style={{ y, rotateX: rx, rotateY: ry, rotateZ: rz, opacity: ph }}>
            <div className="fm-screen">
              <div className="fm-scr-top">
                <PodSphere hue="signal" people={8} inCount={3} size={30} />
                <div>
                  <b>Hoopers</b>
                  <span>8 people · Saturday</span>
                </div>
              </div>
              <div className="fm-scr-status">
                <motion.span style={{ opacity: thinking }}>
                  <i className="fm-think" />
                  Planning your Saturday
                </motion.span>
                <motion.span style={{ opacity: ready }} className="fm-ready">
                  <i />
                  Plan ready
                </motion.span>
              </div>
              <ul className="fm-rows">
                {PLAN.map((row, i) => (
                  <PlanRow key={row.k} p={p} i={i} row={row} />
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </Chapter>
  );
}

/* ── 4 · I'm in: 3 of 8 ticks to 4 of 8, the ring closes, it locks ─────────────────────────────────────── */
function ImIn() {
  const [ref, p] = useChapter(0.9);
  const [n, setN] = useState(3);
  const [locked, setLocked] = useState(false);
  useMotionValueEvent(p, "change", (v) => {
    setN(v >= 0.42 ? 4 : 3);
    setLocked(v >= 0.6);
  });
  // still frames (calm) never fire "change": read once
  useEffect(() => {
    const v = p.get();
    setN(v >= 0.42 ? 4 : 3);
    setLocked(v >= 0.6);
  }, [p]);
  const rx = useTransform(p, [0, 0.3], [58, 0]);
  const sc = useTransform(p, [0, 0.3, 0.6, 0.66, 0.72, 0.9, 1], [0.7, 1, 1, 1.06, 1, 1, 1.25]);
  const ringO = useTransform(p, [0, 0.12, 0.9, 1], [0, 1, 1, 0]);
  const dash = useTransform(p, [0.25, 0.42, 0.6], [0.75, 0.75, 1]);
  const C = 2 * Math.PI * 140;
  const off = useTransform(dash, (d) => C * (1 - d));
  const lockO = useTransform(p, [0.6, 0.68], [0, 1]);
  const glow = useTransform(p, [0.58, 0.7], [0, 1]);
  return (
    <Chapter i={3} sref={ref} label="I'm in" tone="dark" sky="night" className="fm-in">
      <div className="fm-copy fm-copy-top">
        <Line p={p} at={[0.05, 0.16, 0.9, 0.99]} className="fm-h2">
          Four say yes.
          <br />
          <span className="fm-dim">It locks.</span>
        </Line>
      </div>
      <motion.div className="fm-ring" style={{ rotateX: rx, scale: sc, opacity: ringO }} aria-hidden>
        <motion.i className="fm-ring-glow" style={{ opacity: glow }} />
        <svg viewBox="0 0 320 320">
          <circle cx="160" cy="160" r="140" className="fm-ring-track" />
          <motion.circle cx="160" cy="160" r="140" className="fm-ring-arc" data-locked={locked ? "" : undefined} style={{ strokeDasharray: C, strokeDashoffset: off }} />
        </svg>
        {Array.from({ length: 8 }, (_, k) => {
          const a = -Math.PI / 2 + (k / 8) * Math.PI * 2;
          const lit = k < n;
          return <i key={k} className="fm-seat" data-lit={lit ? "" : undefined} data-you={k === 3 ? "" : undefined} style={{ left: `${50 + Math.cos(a) * 43.75}%`, top: `${50 + Math.sin(a) * 43.75}%` }} />;
        })}
        <div className="fm-count">
          <b>
            {n} <span>of 8</span>
          </b>
          <motion.small style={{ opacity: lockO }}>
            <i />
            Locked · Sat 10am
          </motion.small>
        </div>
      </motion.div>
      <div className="fm-copy fm-copy-bottom">
        <Line p={p} at={[0.42, 0.5, 0.9, 0.99]} as="p" className="fm-cap">
          You were the fourth.
        </Line>
      </div>
    </Chapter>
  );
}

/* ── 5 · Saturday: morning light sweeps across; the four meet ──────────────────────────────────────────── */
const MEET: { h: Hue; from: [number, number]; to: [number, number] }[] = [
  { h: "ember", from: [-50, 6], to: [-14, 0] },
  { h: "signal", from: [48, -4], to: [14, -1] },
  { h: "grove", from: [-34, 16], to: [-6, 8] },
  { h: "ember", from: [40, 18], to: [7, 8] },
];
function Walker({ p, m, i, u }: { p: MotionValue<number>; m: (typeof MEET)[number]; i: number; u: number }) {
  const t0 = 0.14 + i * 0.04;
  const x = useTransform(p, [t0, 0.75], [m.from[0] * u, m.to[0] * u]);
  const y = useTransform(p, [t0, 0.75], [m.from[1] * u, m.to[1] * u]);
  const o = useTransform(p, [t0 - 0.08, t0], [0, 1]);
  return (
    <motion.i className="fm-walker" style={{ x, y, opacity: o, "--wh": HEX[m.h] } as unknown as CSSProperties}>
      <i />
    </motion.i>
  );
}
function Saturday() {
  const [ref, p] = useChapter(0.85);
  const vp = useViewport();
  const sweep = useTransform(p, [0, 0.36], ["-110%", "110%"]);
  const sweepO = useTransform(p, [0, 0.04, 0.3, 0.38], [0, 1, 1, 0]);
  const sun = useTransform(p, [0, 0.5], ["30vh", "0vh"]);
  const sunS = useTransform(p, [0, 0.5], [0.6, 1]);
  const ground = useTransform(p, [0.04, 0.25, 0.9, 1], [0, 1, 1, 0]);
  const chip = useTransform(p, [0.62, 0.7], [0, 1]);
  return (
    <Chapter i={4} sref={ref} label="Saturday" tone="light" sky="morning" className="fm-sat">
      <motion.i className="fm-sat-sun" style={{ y: sun, scale: sunS }} aria-hidden />
      <motion.div className="fm-ground" style={{ opacity: ground }} aria-hidden>
        <i className="fm-ground-plane" />
        <div className="fm-meet">
          {MEET.map((m, i) => (
            <Walker key={i} p={p} m={m} i={i} u={Math.min(vp.w, vp.h) / 100} />
          ))}
        </div>
        <motion.span className="fm-chip" style={{ opacity: chip }}>
          Sat 10am · {PLACE}
        </motion.span>
      </motion.div>
      <motion.i className="fm-sweep" style={{ x: sweep, opacity: sweepO }} aria-hidden />
      <div className="fm-copy fm-copy-top">
        <Line p={p} at={[0.22, 0.34, 0.9, 0.99]} className="fm-h2">
          Saturday, 10am.
          <br />
          <span className="fm-dim">Everyone came.</span>
        </Line>
      </div>
    </Chapter>
  );
}

/* ── 6 · Repeat: the weeks pass sideways; hangouts recur; overlaps deepen ──────────────────────────────── */
const WEEKS = [
  { w: "Week 1", what: "Pickup basketball", came: 4, hrs: 2 },
  { w: "Week 2", what: "Pickup basketball", came: 5, hrs: 4 },
  { w: "Week 3", what: "Run, then coffee", came: 5, hrs: 6.5 },
  { w: "Week 4", what: "Pickup basketball", came: 6, hrs: 9 },
  { w: "Week 5", what: "Game night", came: 6, hrs: 12 },
  { w: "Week 6", what: "Trail walk", came: 7, hrs: 15.5 },
  { w: "Week 7", what: "Pickup basketball", came: 7, hrs: 18 },
  { w: "Week 8", what: "Nia's birthday", came: 8, hrs: 22 },
];

function useViewport() {
  const [v, setV] = useState({ w: 1440, h: 900 });
  useEffect(() => {
    const f = () => setV({ w: window.innerWidth, h: window.innerHeight });
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  return v;
}

function useIsPhone() {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 720px)");
    const f = () => setPhone(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return phone;
}

function Week({ tx, i, cw, gap, wk }: { tx: MotionValue<number>; i: number; cw: number; gap: number; wk: (typeof WEEKS)[number] }) {
  const base = i * (cw + gap);
  const off = useTransform(tx, (v) => base + v);
  const ry = useTransform(off, (o) => clamp(-o / (cw * 1.6), -1, 1) * 34);
  const z = useTransform(off, (o) => -Math.min(Math.abs(o) * 0.35, 260));
  const o = useTransform(off, (o) => clamp(1.15 - Math.abs(o) / (cw * 3.2), 0.25, 1));
  const d = 1 - i / 7; // circles start apart and overlap more each week
  return (
    <motion.article className="fm-week" style={{ left: base, rotateY: ry, z, opacity: o }}>
      <header>
        <small>{wk.w}</small>
        <span>{wk.came} of 8 came</span>
      </header>
      <div className="fm-venn" style={{ "--d": d } as CSSProperties}>
        <i data-h="ember" />
        <i data-h="signal" />
        <i data-h="grove" />
      </div>
      <b>{wk.what}</b>
      <div className="fm-hrs">
        <i style={{ width: `${(wk.hrs / 50) * 100}%` }} />
      </div>
      <span className="fm-hrs-l">{wk.hrs} of ~50 hours together</span>
    </motion.article>
  );
}

function Repeat() {
  const [ref, p] = useChapter(0.86);
  const phone = useIsPhone();
  const cw = phone ? 230 : 280;
  const gap = phone ? 16 : 28;
  const shift = (WEEKS.length - 1) * (cw + gap);
  const tx = useTransform(p, [0.1, 0.88], [0, -shift]);
  const strip = useTransform(p, [0, 0.1, 0.92, 1], [0, 1, 1, 0]);
  return (
    <Chapter i={5} sref={ref} label="Repeat" tone="light" sky="day" className="fm-repeat">
      <div className="fm-copy fm-copy-top">
        <Line p={p} at={[0.02, 0.1, 0.9, 0.99]} className="fm-h2">
          Again next week.
          <br />
          <span className="fm-dim">And the week after.</span>
        </Line>
        <Line p={p} at={[0.06, 0.14, 0.9, 0.99]} as="p" className="fm-sub">
          Friends take about 50 hours. Nobody asks for hangout #2, so Pods does.
        </Line>
      </div>
      <motion.div className="fm-strip" style={{ opacity: strip }} aria-hidden>
        <motion.div className="fm-track" style={{ x: tx, "--cw": `${cw}px`, marginLeft: -cw / 2 } as unknown as CSSProperties}>
          {WEEKS.map((wk, i) => (
            <Week key={wk.w} tx={tx} i={i} cw={cw} gap={gap} wk={wk} />
          ))}
        </motion.div>
      </motion.div>
    </Chapter>
  );
}

/* ── 7 · Safe by design: one calm scene ───────────────────────────────────────────────────────────────── */
const SAFE: { t: string; s: string; h: Hue }[] = [
  { t: "Verified people", s: "A live check before you join.", h: "signal" },
  { t: "Public places", s: "Parks, courts, cafés. In daylight.", h: "grove" },
  { t: "Check in", s: "Tap when you arrive. Your pod sees it.", h: "ember" },
  { t: "Report or block", s: "One tap. A real person reviews it.", h: "signal" },
];
function SafeTile({ p, i, s }: { p: MotionValue<number>; i: number; s: (typeof SAFE)[number] }) {
  const a = 0.14 + i * 0.08;
  const o = useTransform(p, [a, a + 0.1, 0.9, 0.99], [0, 1, 1, 0]);
  const z = useTransform(p, [a, a + 0.14], [-220, 0]);
  const y = useTransform(p, [0, 1], [10 + i * 6, -10 - i * 6]);
  return (
    <motion.li className="fm-safe-t" style={{ opacity: o, z, y }}>
      <i style={{ background: HEX[s.h] }} />
      <b>{s.t}</b>
      <span>{s.s}</span>
    </motion.li>
  );
}
function Safe() {
  const [ref, p] = useChapter(0.85);
  return (
    <Chapter i={6} sref={ref} label="Safe by design" tone="light" sky="day" className="fm-safe">
      <div className="fm-safe-in">
        <div className="fm-copy">
          <Line p={p} at={[0.02, 0.12, 0.9, 0.99]} className="fm-h2">
            Safe by design.
          </Line>
        </div>
        <ul className="fm-safe-list">
          {SAFE.map((s, i) => (
            <SafeTile key={s.t} p={p} i={i} s={s} />
          ))}
        </ul>
      </div>
    </Chapter>
  );
}

/* ── 8 · Close: the mark assembles at evening; the one call to action ─────────────────────────────────── */
function Close() {
  const [ref, p] = useChapter(1);
  const phone = useIsPhone();
  const word = useTransform(p, [0.45, 0.6], [0, 1]);
  const wordY = useTransform(p, [0.45, 0.6], [16, 0]);
  const cta = useTransform(p, [0.6, 0.72], [0, 1]);
  const ctaY = useTransform(p, [0.6, 0.72], [16, 0]);
  return (
    <Chapter i={7} sref={ref} label="Find your people" tone="dark" sky="evening" className="fm-close">
      <div className="fm-close-in">
        <div className="fm-close-mark">
          <Trio p={p} at={[0.1, 0.45]} size={phone ? 72 : 100} people={1} />
        </div>
        <motion.div style={{ opacity: word, y: wordY }} className="fm-close-copy">
          <h2 className="fm-h2">
            Find your people.
            <br />
            <span className="fm-dim">Then keep them.</span>
          </h2>
        </motion.div>
        <motion.div style={{ opacity: cta, y: ctaY }}>
          <Link href={START} className="fm-cta">
            Get started
          </Link>
        </motion.div>
      </div>
      <p className="fm-foot">
        © 2026 Pods · <Link href="/safety">Safety</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link>
      </p>
    </Chapter>
  );
}
