// The landing (/), v3: a film in eight chapters, played by scroll alone (PODS/v3/landing-v3/NOTES.md).
// Arrival -> Fit -> The plan -> I'm in -> Saturday -> Safe by design -> Repeat -> Close.
// One protagonist: the glowing "you" dot is a single fixed element (<Me>) whose path is sampled from each chapter's
// own geometry, so it is pulled into the pod, sits in the plan, locks the ring, walks to the court, rides the weeks and
// lands in the logo. Stages are fixed layers cross-faded by page progress, so every scroll position is a finished
// composition; each chapter ends in the shape the next one starts from (pod -> phone icon, phone row -> ring, ring ->
// court circle, court -> map, last week's circles -> the mark). Nothing inside the story is clickable but the nav and
// the closing Get started. Motion is transform/opacity only. Reduced motion: each chapter is one still viewport.
"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "motion/react";
import { Logo } from "@/components/brand/logo";
import { PodSphere } from "@/components/brand/pod-sphere";
import { useCalmMotion } from "@/components/brand/motion";
import { TOPICS, VENUE_BY_ID } from "@/data/plans";
import "./film.css";

export const START = "/app";
export const SIGN_IN = "/app/welcome";

/* ── the timeline: section heights in svh; the page scrolls (total - 100) svh ─────────────────────────────── */
// the turn (plan, yes, lock) gets the most room; Repeat is long because time passes there
const H = [220, 300, 330, 310, 280, 220, 420, 220] as const;
const S = H.reduce<number[]>((a, h, i) => [...a, i ? a[i - 1] + H[i - 1] - 100 : 0], []);
const L = S[H.length - 1] + H[H.length - 1] - 100;
/** page progress (0-1) at chapter i, local progress p */
const g = (i: number, p: number) => (S[i] + p * (H[i] - 100)) / L;
/** the cross-fade between two stages, in page progress (10svh each side) */
const XF = 10 / L;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}
/** keyframes [p, ...values]; eased (slow in, slow out) between keys */
type Key = number[];
function track(keys: Key[], p: number): number[] {
  if (p <= keys[0][0]) return keys[0].slice(1);
  for (let k = 1; k < keys.length; k++) {
    if (p <= keys[k][0]) {
      const a = keys[k - 1];
      const b = keys[k];
      const t = smooth((p - a[0]) / (b[0] - a[0] || 1));
      return a.slice(1).map((v, j) => lerp(v, b[j + 1], t));
    }
  }
  return keys[keys.length - 1].slice(1);
}
const useTrack = (p: MotionValue<number>, keys: Key[], j: number) => useTransform(p, (x) => track(keys, x)[j]);

/* the plan, from the seed so page and app agree */
const BB = TOPICS.basketball;
const PLACE = VENUE_BY_ID[BB.venue]?.short_name ?? "The park courts";
const RAIN = (BB.rainVenue && VENUE_BY_ID[BB.rainVenue]?.short_name) || "Indoors";

type Hue = "ember" | "signal" | "grove";
const HUES: Hue[] = ["ember", "signal", "grove"];
const HEX: Record<Hue, string> = { ember: "var(--pods-ember)", signal: "var(--pods-signal)", grove: "var(--pods-grove)" };
/** PodSphere's hue keys are slot names; these give the logo colour */
const SPHERE: Record<Hue, "signal" | "ember" | "grove"> = { ember: "signal", signal: "ember", grove: "grove" };
/** the mark's circle centres relative to its centre, in circle radii (logo-geometry.ts), and its dots */
const MARK: Record<Hue, [number, number]> = { ember: [0, -0.78], signal: [-0.74, 0.39], grove: [0.74, 0.39] };
const MDOT: Record<Hue, [number, number]> = { ember: [0, -0.39], signal: [-0.33, 0.155], grove: [0.33, 0.155] };

/* ── geometry: every scene and the protagonist's path come from one place (px from the viewport centre) ───── */
const WEEKS = [
  { w: "Week 1", what: "Pickup basketball", came: 4, hrs: 2 },
  { w: "Week 2", what: "Pickup basketball", came: 5, hrs: 6 },
  { w: "Week 3", what: "Run, then coffee", came: 5, hrs: 11 },
  { w: "Week 4", what: "Pickup basketball", came: 6, hrs: 17 },
  { w: "Week 5", what: "Game night", came: 6, hrs: 24 },
  { w: "Week 6", what: "Trail walk", came: 7, hrs: 32 },
  { w: "Week 7", what: "Pickup basketball", came: 7, hrs: 41 },
  { w: "Week 8", what: "Nia's birthday", came: 8, hrs: 50 },
];

function geo(w: number, h: number) {
  const phone = w <= 720;
  const stack = w < 1024;
  // Fit
  const F = { x: 0, y: 0.04 * h };
  const size = phone ? 110 : 180;
  const r = size / 2;
  // The plan: the phone
  const pw = phone ? Math.min(240, 0.62 * w) : stack ? 260 : h >= 820 ? 320 : 270;
  const ph = pw * 2.05;
  const P = stack ? { x: 0, y: 0.29 * h + ph / 2 - h / 2 } : { x: Math.min(0.19 * w, 300), y: 0.03 * h };
  const pp = phone ? 8 : 10;
  const st = phone ? 38 : 44;
  const sx = phone ? 12 : 16;
  const ic = 40;
  const IC = { x: P.x - pw / 2 + pp + sx + ic / 2, y: P.y - ph / 2 + pp + st + ic / 2 };
  const sd = 0.075 * pw;
  const SY = P.y + ph / 2 - 0.1 * pw;
  const seatX = (k: number) => P.x + (k - 3.5) * 0.105 * pw;
  // I'm in: the ring
  const Rc = { x: 0, y: (phone ? 0.08 : 0.07) * h };
  const rs = phone ? Math.min(0.74 * w, 300) : Math.min(0.56 * Math.min(w, h), 380);
  const R = 0.4375 * rs;
  const sdR = 0.09 * rs;
  const ringAt = (k: number) => {
    const a = -Math.PI / 2 + (k / 8) * Math.PI * 2;
    return { x: Math.cos(a) * R, y: Math.sin(a) * R };
  };
  // Saturday: the court in perspective
  const hz = -0.03 * h;
  const yf = 0.06 * h;
  const yn = 0.46 * h;
  const wf = (phone ? 0.3 : 0.2) * w;
  const wn = (phone ? 0.62 : 0.36) * w;
  const yc = yf + 0.4 * (yn - yf);
  const wc = wf + 0.4 * (wn - wf);
  const crx = wc * (phone ? 0.42 : 0.32);
  const cry = crx * 0.32;
  const hd = phone ? 22 : 30;
  const depth = (y: number) => 0.75 + clamp((y - yf) / (yn - yf), 0, 1) * 0.6;
  const WALK: { me?: boolean; h: Hue; from: [number, number]; to: [number, number]; t: [number, number] }[] = [
    { me: true, h: "ember", from: [0.28 * w, 0.4 * h], to: [0.5 * crx, yc + 0.5 * cry], t: [0.06, 0.6] },
    { h: "grove", from: [-0.62 * w, 0.14 * h], to: [-0.62 * crx, yc + 0.15 * cry], t: [0.03, 0.56] },
    { h: "signal", from: [0.2 * w, yf + 0.005 * h], to: [0.04 * crx, yc - 0.9 * cry], t: [0.08, 0.62] },
    { h: "signal", from: [-0.32 * w, 0.58 * h], to: [-0.16 * crx, yc + 1.3 * cry], t: [0.1, 0.64] },
  ];
  const head = (f: [number, number]) => {
    const s = depth(f[1]);
    return [f[0], f[1] - 1.9 * hd * s, hd * s];
  };
  const youStart = head(WALK[0].from);
  const youMeet = head(WALK[0].to);
  // Safe: a map card around the park
  const mw = phone ? Math.min(350, w - 40) : 620;
  const mh = phone ? 250 : 300;
  const Mc = { x: 0, y: yc - (phone ? 30 : 40) };
  // Repeat: the week strip, then the outcome
  const cw = phone ? 220 : 260;
  const ch = cw * 1.08;
  const gap = phone ? 16 : 28;
  const Ty = (phone ? 0.14 : 0.12) * h;
  const rv = 0.1 * cw;
  const vy = Ty - 0.06 * ch;
  const sp = (i: number) => 1 + 0.9 * (1 - i / 7);
  const dotY = (i: number) => vy + MARK.ember[1] * rv * sp(i) + MDOT.ember[1] * rv;
  const rvF = phone ? 46 : 62;
  const Vf = { x: phone ? 0 : -0.1 * w, y: (phone ? 0.02 : 0.06) * h };
  // Close: the mark
  const rr = phone ? 36 : 50;
  const Cm = { x: 0, y: (phone ? -0.14 : -0.17) * h };
  return { w, h, phone, stack, F, size, r, pw, ph, P, pp, st, sx, ic, IC, sd, SY, seatX, Rc, rs, R, sdR, ringAt, hz, yf, yn, wf, wn, yc, wc, crx, cry, hd, depth, WALK, head, youStart, youMeet, mw, mh, Mc, cw, ch, gap, Ty, rv, vy, sp, dotY, rvF, Vf, rr, Cm };
}
type Geo = ReturnType<typeof geo>;
const GeoCtx = createContext<Geo>(geo(1440, 900));
const useGeo = () => useContext(GeoCtx);

/** Repeat's clock: weeks step one at a time (hold, slide, hold) between p 0.08 and 0.62 */
function weekAt(p: number) {
  const x = clamp((p - 0.08) / 0.54, 0, 1) * 7;
  const k = Math.min(6, Math.floor(x));
  const e = smooth(clamp((x - k - 0.45) / 0.55, 0, 1));
  return { s: k + e, k, e };
}
/** Repeat's ending: the strip gathers into one deep overlap, p 0.62 to 0.74 */
const gatherAt = (p: number) => smooth(clamp((p - 0.62) / 0.12, 0, 1));

/** the protagonist's position (x, y) and diameter in each chapter, local progress p */
function me(i: number, p: number, G: Geo): number[] {
  const { F, r, size, IC, ic, seatX, SY, sd, Rc, ringAt, sdR, youStart, youMeet } = G;
  const s3 = ringAt(3);
  switch (i) {
    case 0:
      return track([[0, 0, 0.08 * G.h, 28], [0.5, 0, 0.08 * G.h, 28], [1, 0, F.y, 24]], p);
    case 1:
      return track([[0, 0, F.y, 24], [0.3, 0, F.y, 24], [0.56, 0, F.y - 0.78 * r, 20], [0.74, 0, F.y - 1.38 * r, 0.16 * size], [0.86, 0, F.y - 1.38 * r, 0.16 * size], [1, IC.x, IC.y - 0.3 * ic, 0.16 * ic + 1]], p);
    case 2:
      return track([[0, IC.x, IC.y - 0.3 * ic, 0.16 * ic + 1], [0.66, IC.x, IC.y - 0.3 * ic, 0.16 * ic + 1], [0.82, seatX(3), SY, sd * 0.9], [1, seatX(3), SY, sd * 0.9]], p);
    case 3:
      return track([[0, seatX(3), SY, sd * 0.9], [0.03, seatX(3), SY, sd * 0.9], [0.3, Rc.x + s3.x, Rc.y + s3.y, sdR * 0.9], [0.42, Rc.x + s3.x, Rc.y + s3.y, sdR * 0.9], [0.52, Rc.x + s3.x, Rc.y + s3.y, sdR * 1.3], [0.84, Rc.x + s3.x, Rc.y + s3.y, sdR * 1.3], [1, ...youStart]], p);
    case 4:
      return track([[0, ...youStart], [0.06, ...youStart], [0.6, ...youMeet]], p);
    case 5:
      return youMeet;
    case 6: {
      const d = 0.5 * G.rv * 1.25;
      if (p < 0.08) return track([[0, ...youMeet], [0.08, 0, G.dotY(0), d]], p);
      const gt = gatherAt(p);
      const { k, e } = weekAt(p);
      const y = lerp(G.dotY(k), G.dotY(Math.min(7, k + 1)), e) - Math.sin(Math.PI * e) * 0.12 * G.cw;
      const fy = G.Vf.y + (MARK.ember[1] + MDOT.ember[1]) * G.rvF;
      return [lerp(0, G.Vf.x, gt), lerp(y, fy, gt), lerp(d, 0.5 * G.rvF, gt)];
    }
    default: {
      const t = smooth(clamp(p / 0.4, 0, 1));
      const rad = lerp(G.rvF, G.rr, t);
      const k = lerp(-(0.78 + 0.39), -(0.78 + 0.6), t);
      return [lerp(G.Vf.x, G.Cm.x, t), lerp(G.Vf.y, G.Cm.y, t) + k * rad, lerp(0.5 * G.rvF, 0.18 * 2 * G.rr, t)];
    }
  }
}

export function Film() {
  const calm = useCalmMotion();
  const [vp, setVp] = useState({ w: 1440, h: 900 });
  const probe = useRef<HTMLElement>(null);
  useEffect(() => {
    // 100svh, not innerHeight: the phone's toolbar must not move the geometry
    const f = () => {
      const el = probe.current;
      if (el) setVp((o) => (o.w === el.offsetWidth && o.h === el.offsetHeight ? o : { w: el.offsetWidth, h: el.offsetHeight }));
    };
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  const G = useMemo(() => geo(vp.w, vp.h), [vp.w, vp.h]);
  return (
    <div className="fm" data-calm={calm ? "" : undefined}>
      <i ref={probe} className="fm-probe" aria-hidden />
      <Sky />
      <FilmNav />
      <GeoCtx.Provider value={G}>
        <main id="main" key={`${vp.w}x${vp.h}`}>
          <Arrival />
          <Fit />
          <Plan />
          <ImIn />
          <Saturday />
          <Safe />
          <Repeat />
          <Close />
        </main>
        {!calm && <Me key={`me-${vp.w}x${vp.h}`} />}
      </GeoCtx.Provider>
    </div>
  );
}

/* ── the protagonist: one dot, one element, the whole film ───────────────────────────────────────────────── */
function Me() {
  const G = useGeo();
  const { scrollYProgress: v } = useScroll();
  const lut = useMemo(() => {
    const ts: number[] = [];
    const vs: number[][] = [];
    for (let i = 0; i < H.length; i++) {
      const n = i === 6 ? 240 : 64;
      for (let j = i ? 1 : 0; j <= n; j++) {
        ts.push(g(i, j / n));
        vs.push(me(i, j / n, G));
      }
    }
    return { ts, vs };
  }, [G]);
  const at = (t: number, c: number) => {
    const { ts, vs } = lut;
    if (t <= ts[0]) return vs[0][c];
    if (t >= ts[ts.length - 1]) return vs[vs.length - 1][c];
    let lo = 0;
    let hi = ts.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (ts[m] <= t) lo = m;
      else hi = m;
    }
    return lerp(vs[lo][c], vs[hi][c], (t - ts[lo]) / (ts[hi] - ts[lo] || 1));
  };
  const x = useTransform(v, (t) => at(t, 0));
  const y = useTransform(v, (t) => at(t, 1));
  const scale = useTransform(v, (t) => at(t, 2) / 28);
  return (
    <motion.div className="fm-me" style={{ x, y, scale }} aria-hidden>
      <i className="fm-bead" />
    </motion.div>
  );
}

/* ── nav: the only chrome; its ink follows the sky ─────────────────────────────────────────────────────────── */
function useTone() {
  const { scrollYProgress } = useScroll();
  const [tone, setTone] = useState<"dark" | "light">("dark");
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setTone(v > g(4, 0.02) && v < g(6, 0.7) ? "light" : "dark");
  });
  return { tone };
}

export function FilmNav({ tone: forced }: { tone?: "dark" | "light" }) {
  const { tone } = useTone();
  const t = forced ?? tone;
  return (
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
  );
}

/* ── the sky: brand light cross-faded by page progress, three drifting pools, grain, floor fog ───────────── */
function Sky() {
  const { scrollYProgress: v } = useScroll();
  const night = useTransform(v, [g(0, 0.6), g(1, 0.15), g(3, 0.9), g(4, 0.08)], [0, 1, 1, 0]);
  const morning = useTransform(v, [g(3, 0.9), g(4, 0.08), g(5, 0.1), g(5, 0.5)], [0, 1, 1, 0]);
  const day = useTransform(v, [g(5, 0.1), g(5, 0.5), g(6, 0.6), g(6, 0.76)], [0, 1, 1, 0]);
  const evening = useTransform(v, [g(6, 0.6), g(6, 0.76)], [0, 1]);
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

/* ── a chapter: a tall section for scroll length, a fixed stage cross-faded by page progress ──────────────── */
function useChapter(still: number): [RefObject<HTMLElement | null>, MotionValue<number>] {
  const ref = useRef<HTMLElement>(null);
  const calm = useCalmMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const p = useTransform(scrollYProgress, (x) => (calm ? still : x));
  return [ref, p];
}

function Chapter({ i, sref, label, tone, sky, children, className }: { i: number; sref: RefObject<HTMLElement | null>; label: string; tone: "dark" | "light"; sky: string; children: ReactNode; className?: string }) {
  const calm = useCalmMotion();
  const { scrollYProgress: v } = useScroll();
  const a = g(i, 0);
  const b = g(i, 1);
  const o = useTransform(v, i === 0 ? [b, b + XF] : i === H.length - 1 ? [a - XF, a] : [a - XF, a, b, b + XF], i === 0 ? [1, 0] : i === H.length - 1 ? [0, 1] : [0, 1, 1, 0]);
  const vis = useTransform(o, (x) => (x > 0.002 ? "visible" : "hidden"));
  return (
    <section ref={sref} className={`fm-ch ${className ?? ""}`} style={{ "--h": `${H[i]}svh` } as CSSProperties} aria-label={label}>
      <motion.div className="fm-stage" data-tone={tone} data-sky={sky} style={calm ? { opacity: 1, visibility: "visible" } : { opacity: o, visibility: vis }}>
        {children}
      </motion.div>
    </section>
  );
}

/** a headline that fades up in [a,b] and out in [c,d] */
function Line({ p, at, children, className, as = "h2" }: { p: MotionValue<number>; at: [number, number, number, number]; children: ReactNode; className?: string; as?: "h1" | "h2" | "p" }) {
  const o = useTransform(p, at, [0, 1, 1, 0]);
  const y = useTransform(p, at, [24, 0, 0, -24]);
  const M = as === "h1" ? motion.h1 : as === "p" ? motion.p : motion.h2;
  return (
    <M className={className} style={{ opacity: o, y }}>
      {children}
    </M>
  );
}

/** the scene origin: the viewport centre; children are placed in px from it */
const O = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div className="fm-o" style={style} aria-hidden>
    {children}
  </div>
);
/** a still-only stand-in for the protagonist (reduced motion), at (x, y) with diameter d */
const LocalMe = ({ x, y, d }: { x: number; y: number; d: number }) => <i className="fm-bead fm-local" style={{ left: x - 14, top: y - 14, scale: d / 28 }} />;

/* ── 1 · Arrival: dusk over a city that isn't yours yet; one dot ───────────────────────────────────────────── */
/* a believable dusk skyline: window grids floor by floor (some lit warm, a few TV-blue, many dark), rooftops with
   setbacks, antennas with a red light, water towers, the odd pointed top; nearer layers get bigger windows */
type Roof = "flat" | "setback" | "antenna" | "tower" | "peak";
type Bld = { x: number; w: number; h: number; roof: Roof; wins: { x: number; y: number; c: string }[]; ww: number; wh: number };
const LAYER = {
  far: { cw: 6, ch: 8, ww: 2.4, wh: 3.4, lit: 0.22 },
  mid: { cw: 9, ch: 12, ww: 4, wh: 5.5, lit: 0.3 },
  near: { cw: 13, ch: 17, ww: 6, wh: 8, lit: 0.34 },
} as const;
function city(seed: number, n: number, minH: number, maxH: number, layer: keyof typeof LAYER): Bld[] {
  const r = rng(seed);
  const Ly = LAYER[layer];
  const out: Bld[] = [];
  let x = -20;
  for (let k = 0; k < n && x < 1460; k++) {
    const w = 42 + r() * 74;
    const h = minH + r() * (maxH - minH);
    const pick = r();
    const roof: Roof = pick < 0.45 ? "flat" : pick < 0.65 ? "setback" : pick < 0.8 ? "antenna" : pick < 0.92 ? "tower" : "peak";
    const wins: Bld["wins"] = [];
    const cols = Math.max(1, Math.floor((w - 10) / Ly.cw));
    const rows = Math.max(1, Math.floor((h - 14) / Ly.ch));
    const x0 = x + (w - cols * Ly.cw) / 2 + (Ly.cw - Ly.ww) / 2;
    const darkFloor = Math.floor(r() * rows);
    for (let row = 0; row < rows; row++) {
      if (row === darkFloor && rows > 3) continue; // one floor fully dark
      for (let c = 0; c < cols; c++) {
        if (r() > Ly.lit) continue;
        const tv = r() < 0.12;
        wins.push({ x: x0 + c * Ly.cw, y: 400 - h + 10 + row * Ly.ch, c: tv ? "#9fc4ff" : r() < 0.5 ? "#ffd9a0" : "#ffbf73" });
      }
    }
    out.push({ x, w, h, roof, wins, ww: Ly.ww, wh: Ly.wh });
    x += w + r() * 5;
  }
  return out;
}
const FAR = city(7, 40, 90, 230, "far");
const MID = city(19, 34, 60, 170, "mid");
const NEAR = city(31, 26, 30, 110, "near");
// building fills sit in the sky's own hue: deep signal blue, darker toward us
const FILL = { far: "#173a7c", mid: "#0e2a60", near: "#06173c" } as const;
const RIM = { far: "rgb(255 150 100 / .12)", mid: "rgb(253 120 70 / .12)", near: "rgb(253 110 60 / .08)" } as const;

function Roofline({ s, fill }: { s: Bld; fill: string }) {
  const top = 400 - s.h;
  const cx = s.x + s.w / 2;
  switch (s.roof) {
    case "setback":
      return <rect x={s.x + s.w * 0.18} y={top - s.h * 0.12} width={s.w * 0.64} height={s.h * 0.12 + 1} fill={fill} />;
    case "antenna":
      return (
        <>
          <rect x={cx - 1} y={top - 34} width={2} height={34} fill={fill} />
          <circle className="fm-beacon" cx={cx} cy={top - 35} r={2.2} fill="#ff4d4d" />
        </>
      );
    case "tower":
      return (
        <g fill={fill}>
          <rect x={s.x + s.w * 0.62} y={top - 16} width={14} height={11} rx={2} />
          <rect x={s.x + s.w * 0.62 + 2} y={top - 6} width={2} height={6} />
          <rect x={s.x + s.w * 0.62 + 10} y={top - 6} width={2} height={6} />
        </g>
      );
    case "peak":
      return <path d={`M${s.x} ${top + 1} L${cx} ${top - s.w * 0.45} L${s.x + s.w} ${top + 1} Z`} fill={fill} />;
    default:
      return <rect x={s.x - 2} y={top - 3} width={s.w + 4} height={4} fill={fill} />;
  }
}

function Skyline({ b, tone }: { b: Bld[]; tone: "far" | "mid" | "near" }) {
  const fill = FILL[tone];
  return (
    <svg viewBox="0 0 1440 400" preserveAspectRatio="xMidYMax slice" className="fm-city-svg" data-l={tone}>
      {b.map((s, k) => (
        <g key={k}>
          <Roofline s={s} fill={fill} />
          <rect x={s.x} y={400 - s.h} width={s.w} height={s.h} rx={tone === "near" ? 3 : 1.5} fill={fill} />
          {/* the sun-side edge catches a little light */}
          <rect x={s.x + s.w - 3} y={400 - s.h} width={3} height={s.h} fill={RIM[tone]} />
          {s.wins.map((w, j) => (
            <rect key={j} x={w.x} y={w.y} width={s.ww} height={s.wh} rx={0.6} fill={w.c} className="fm-win" />
          ))}
        </g>
      ))}
    </svg>
  );
}

function Arrival() {
  const G = useGeo();
  const [ref, p] = useChapter(0.2);
  const far = useTransform(p, [0, 1], [1, 1.12]);
  const mid = useTransform(p, [0, 1], [1, 1.3]);
  const near = useTransform(p, [0, 1], [1, 1.7]);
  const nearY = useTransform(p, [0, 1], ["0%", "18%"]);
  const nearO = useTransform(p, [0.5, 0.95], [1, 0]);
  const cityO = useTransform(p, [0.7, 1], [1, 0.4]);
  const sun = useTransform(p, [0, 1], ["0%", "60%"]);
  const sunO = useTransform(p, [0.6, 1], [1, 0.2]);
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
      <O>
        <LocalMe x={0} y={0.08 * G.h} d={28} />
      </O>
      <motion.p className="fm-hint" style={{ opacity: hint }} aria-hidden>
        <i />
        Scroll
      </motion.p>
    </Chapter>
  );
}

/* ── 2 · Fit: a few people drift in from depth, the ones who fit pull together into pods; yours flies to the phone */
const TAGS: Record<Hue, string> = { ember: "Pickup hoops", signal: "Live music", grove: "Trail walks" };
const r2 = rng(5);
// few people, not a swarm: nine who fit (three per pod) and five who drift past; never above the headline
const CROWD = Array.from({ length: 14 }, (_, k) => {
  const fit: Hue | null = k < 9 ? HUES[k % 3] : null;
  return { k, fit, x: (r2() - 0.5) * 84, y: -8 + r2() * 44, z: -300 - r2() * 1100, s: 0.7 + r2() * 0.5, jx: (r2() - 0.5) * 2, jy: (r2() - 0.5) * 2 };
});

function Person({ p, d }: { p: MotionValue<number>; d: (typeof CROWD)[number] }) {
  const G = useGeo();
  const { F, r } = G;
  const z = useTransform(p, [0, 0.35], [d.z, 0]);
  const c = d.fit ? MARK[d.fit] : [0, 0];
  const x0 = (d.x * G.w) / 100;
  const y0 = (d.y * G.h) / 100;
  const x = useTransform(p, [0.3, 0.56], [x0, d.fit ? F.x + c[0] * r + d.jx * r * 0.32 : x0 * 1.7]);
  const y = useTransform(p, [0.3, 0.56], [y0, d.fit ? F.y + c[1] * r + d.jy * r * 0.32 : y0 * 1.5 + 0.1 * G.h]);
  const o = useTransform(p, d.fit ? [0, 0.08, 0.6, 0.68] : [0, 0.08, 0.3, 0.44], [0, 1, 1, 0]);
  const tint = useTransform(p, [0.22, 0.34], [0, 1]);
  return (
    <motion.i className="fm-person" style={{ x, y, z, opacity: o, scale: d.s }}>
      {d.fit && <motion.b style={{ opacity: tint, borderColor: HEX[d.fit] }} />}
    </motion.i>
  );
}

function FitPod({ p, h }: { p: MotionValue<number>; h: Hue }) {
  const { F, r, size, IC, ic } = useGeo();
  const [mx, my] = MARK[h];
  const cx = F.x + mx * r;
  const cy = F.y + my * r;
  // yours (ember) shrinks into the phone's pod icon; the other two drift away
  const end = h === "ember" ? [1, IC.x, IC.y, ic / size, 1] : [1, cx * 1.9, cy * 1.6 - 0.04 * size, 0.6, 0];
  const keys: Key[] = [[0.54, cx, cy, 0.25, 0], [0.62, cx, cy, 0.6, 1], [0.74, cx, cy, 1, 1], [0.86, cx, cy, 1, 1], end];
  const x = useTrack(p, keys, 0);
  const y = useTrack(p, keys, 1);
  const scale = useTrack(p, keys, 2);
  const opacity = useTrack(p, keys, 3);
  return (
    <motion.div className="fm-at" style={{ x, y, scale, opacity, width: size, height: size }}>
      <PodSphere hue={SPHERE[h]} people={h === "ember" ? 4 : 3} inCount={h === "ember" ? 1 : 3} you={h === "ember"} size={size} />
    </motion.div>
  );
}

function Tag({ p, h }: { p: MotionValue<number>; h: Hue }) {
  const { F, r } = useGeo();
  const o = useTransform(p, [0.72, 0.78, 0.84, 0.88], [0, 1, 1, 0]);
  const [mx, my] = MARK[h];
  // above the top pod; outside-left / outside-right of the lower two
  const x = F.x + mx * r * 1.35;
  const y = F.y + (my < 0 ? my * r - r * 1.2 : my * r + r * 1.3);
  const tr = mx < 0 ? "-80% -50%" : mx > 0 ? "-20% -50%" : "-50% -50%";
  return (
    <motion.span className="fm-tag" style={{ opacity: o, left: x, top: y, translate: tr }}>
      <i style={{ background: HEX[h] }} />
      {TAGS[h]}
    </motion.span>
  );
}

function Fit() {
  const [ref, p] = useChapter(0.8);
  return (
    <Chapter i={1} sref={ref} label="Fit" tone="dark" sky="night" className="fm-fit">
      <O>
        {CROWD.map((d) => (
          <Person key={d.k} p={p} d={d} />
        ))}
        {(["signal", "grove", "ember"] as Hue[]).map((h) => (
          <FitPod key={h} p={p} h={h} />
        ))}
        {HUES.map((h) => (
          <Tag key={h} p={p} h={h} />
        ))}
      </O>
      <div className="fm-copy fm-copy-top">
        <Line p={p} at={[0.04, 0.12, 0.84, 0.92]} className="fm-h2">
          Not more people.
          <br />
          <span className="fm-dim">The right few.</span>
        </Line>
      </div>
      <div className="fm-copy fm-copy-bottom">
        <Line p={p} at={[0.7, 0.76, 0.84, 0.9]} as="p" className="fm-cap">
          A pod: 6 to 10 people near you, picked for fit.
        </Line>
      </div>
    </Chapter>
  );
}

/* ── 3 · The plan: your pod becomes the phone's icon; the AI fills the plan; you take your seat ───────────── */
const PLAN: { k: string; v: string; s?: string }[] = [
  { k: "What", v: "Pickup basketball", s: "Rotating 5-on-5" },
  { k: "When", v: "Sat 10am", s: "7 of 8 are free" },
  { k: "Where", v: PLACE, s: "Public courts, daylight" },
  { k: "If it rains", v: RAIN },
];

function PlanRow({ p, i, row }: { p: MotionValue<number>; i: number; row: (typeof PLAN)[number] }) {
  const a = 0.14 + i * 0.09;
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

/** the pod's eight seats as a row (in the phone) — the shape the ring is made from */
function Seats({ p, at }: { p: MotionValue<number>; at: [number, number] }) {
  const G = useGeo();
  const o = useTransform(p, at, [0, 1]);
  return (
    <motion.div style={{ opacity: o }}>
      <span className="fm-seats-l" style={{ left: G.seatX(0) - G.sd / 2, top: G.SY - G.sd / 2 - 22, width: G.seatX(7) - G.seatX(0) + G.sd }}>
        <b>Who&apos;s in</b>
        <span>3 of 8</span>
      </span>
      {Array.from({ length: 8 }, (_, k) => (
        <i key={k} className="fm-seat fm-at" data-lit={k < 3 ? "" : undefined} data-you={k === 3 ? "" : undefined} style={{ left: G.seatX(k), top: G.SY, width: G.sd, height: G.sd }} />
      ))}
      <LocalMe x={G.seatX(3)} y={G.SY} d={G.sd * 0.9} />
    </motion.div>
  );
}

function Plan() {
  const G = useGeo();
  const [ref, p] = useChapter(0.9);
  const ph = useTransform(p, [0, 0.06, 0.88, 1], [0.3, 1, 1, 0.25]);
  const rx = useTransform(p, [0, 0.1], [12, 0]);
  const ry = useTransform(p, [0, 0.1], [-10, 0]);
  const py = useTransform(p, [0, 0.1], [24, 0]);
  const thinking = useTransform(p, [0.1, 0.14, 0.48, 0.52], [0, 1, 1, 0]);
  const ready = useTransform(p, [0.5, 0.55], [0, 1]);
  const copyStyle: CSSProperties | undefined = G.stack
    ? undefined
    : (() => {
        const right = G.P.x - G.pw / 2 - 56;
        const left = Math.max(64 - G.w / 2, right - 520);
        return { left: `calc(50% + ${left}px)`, width: right - left, top: `calc(50% + ${G.P.y}px)`, translate: "0 -50%" };
      })();
  return (
    <Chapter i={2} sref={ref} label="The plan" tone="dark" sky="night" className="fm-plan">
      <div className={`fm-copy ${G.stack ? "fm-copy-top" : "fm-plan-copy"}`} style={copyStyle}>
        <Line p={p} at={[0.0, 0.07, 0.9, 0.98]} className="fm-h2">
          The AI plans it.
          <br />
          <span className="fm-dim">You just say yes.</span>
        </Line>
      </div>
      <O style={{ perspective: 1000 }}>
        <motion.div className="fm-phone fm-at" style={{ left: G.P.x, top: G.P.y, y: py, rotateX: rx, rotateY: ry, opacity: ph, "--pw": `${G.pw}px` } as unknown as CSSProperties}>
          <div className="fm-screen">
            <div className="fm-scr-top">
              <PodSphere hue="signal" people={8} inCount={3} size={G.ic} />
              <div>
                <b>Hoopers</b>
                <span>8 people · near you</span>
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
        <Seats p={p} at={[0.56, 0.64]} />
      </O>
    </Chapter>
  );
}

/* ── 4 · I'm in: the row of seats opens into a ring, you take the fourth seat, it locks; then it lies down ──── */
function RingSeat({ p, k, lit }: { p: MotionValue<number>; k: number; lit: boolean }) {
  const G = useGeo();
  const ring = G.ringAt(k);
  const keys: Key[] = [[0.03, G.seatX(k) - G.Rc.x, G.SY - G.Rc.y, G.sd / G.sdR], [0.3, ring.x, ring.y, 1]];
  const x = useTrack(p, keys, 0);
  const y = useTrack(p, keys, 1);
  const scale = useTrack(p, keys, 2);
  return <motion.i className="fm-seat fm-at" data-lit={lit ? "" : undefined} data-you={k === 3 ? "" : undefined} style={{ x, y, scale, width: G.sdR, height: G.sdR }} />;
}

function ImIn() {
  const G = useGeo();
  const [ref, p] = useChapter(0.7);
  const [n, setN] = useState(3);
  useMotionValueEvent(p, "change", (v) => setN(v >= 0.5 ? 4 : 3));
  // still frames (calm) never fire "change": read once
  useEffect(() => setN(p.get() >= 0.5 ? 4 : 3), [p]);
  const locked = n === 4;
  const track0 = useTransform(p, [0.08, 0.26], [0, 1]);
  const dash = useTransform(p, [0.5, 0.6], [0.75, 1]);
  const C = 2 * Math.PI * 140;
  const off = useTransform(dash, (d) => C * (1 - d));
  const lockO = useTransform(p, [0.6, 0.66], [0, 1]);
  const glow = useTransform(p, [0.56, 0.68, 0.84, 0.92], [0, 1, 1, 0]);
  const count = useTransform(p, [0.3, 0.38, 0.82, 0.88], [0, 1, 1, 0]);
  const seatsO = useTransform(p, [0.84, 0.94], [1, 0]);
  // the locked ring lies down and becomes Saturday's centre circle
  const fy = useTransform(p, [0.84, 1], [0, G.yc - G.Rc.y], { ease: smooth });
  const fs = useTransform(p, [0.84, 1], [1, G.crx / G.R], { ease: smooth });
  const fsy = useTransform(p, [0.84, 1], [1, G.cry / G.crx], { ease: smooth });
  const pulse = useTransform(p, [0.52, 0.58, 0.66], [1, 1.06, 1]);
  return (
    <Chapter i={3} sref={ref} label="I'm in" tone="dark" sky="night" className="fm-in">
      <div className="fm-copy fm-copy-top">
        <Line p={p} at={[0.02, 0.1, 0.4, 0.46]} className="fm-h2">
          One seat left.
        </Line>
      </div>
      <div className="fm-copy fm-copy-top">
        <Line p={p} at={[0.5, 0.56, 0.86, 0.94]} className="fm-h2">
          You&apos;re in.
          <br />
          <span className="fm-dim">Enough said yes. It locks.</span>
        </Line>
      </div>
      <O>
        <motion.div className="fm-ring" style={{ left: G.Rc.x, top: G.Rc.y, y: fy, scale: fs }}>
          <motion.div style={{ scaleY: fsy }}>
            <motion.div style={{ scale: pulse }}>
              <motion.i className="fm-ring-glow fm-at" style={{ opacity: glow, width: G.rs * 1.4, height: G.rs * 1.4 }} />
              <motion.svg viewBox="0 0 320 320" className="fm-at" style={{ width: G.rs, height: G.rs, opacity: track0 }}>
                <circle cx="160" cy="160" r="140" className="fm-ring-track" />
                <motion.circle cx="160" cy="160" r="140" className="fm-ring-arc" data-locked={locked ? "" : undefined} style={{ strokeDasharray: C, strokeDashoffset: off }} />
              </motion.svg>
              <motion.div style={{ opacity: seatsO }}>
                {Array.from({ length: 8 }, (_, k) => (
                  <RingSeat key={k} p={p} k={k} lit={k < n} />
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
        <motion.div className="fm-count fm-at" style={{ left: G.Rc.x, top: G.Rc.y, opacity: count }}>
          <b>
            {n} <span>of 8</span>
          </b>
          <motion.small style={{ opacity: lockO }}>
            <i />
            Locked · Sat 10am
          </motion.small>
        </motion.div>
      </O>
    </Chapter>
  );
}

/* ── 5 · Saturday: a park in morning light; four people walk in from four sides and meet at the circle ────── */
function Walker({ p, k }: { p: MotionValue<number>; k: number }) {
  const G = useGeo();
  const m = G.WALK[k];
  const keys: Key[] = [[m.t[0], ...m.from, G.depth(m.from[1])], [m.t[1], ...m.to, G.depth(m.to[1])]];
  const x = useTrack(p, keys, 0);
  const y = useTrack(p, keys, 1);
  const scale = useTrack(p, keys, 2);
  const o = useTransform(p, m.me ? [0, 1] : [m.t[0] - 0.04, m.t[0] + 0.02], m.me ? [1, 1] : [0, 1]);
  return (
    <motion.div className="fm-walker" style={{ x, y, scale, opacity: o, "--wh": HEX[m.h], "--hd": `${G.hd}px` } as unknown as CSSProperties}>
      <i className="fm-walker-sh" />
      <i className="fm-walker-body" />
      <i className={`fm-walker-head${m.me ? " fm-local" : ""}`} />
    </motion.div>
  );
}

function Park() {
  const G = useGeo();
  const { w, h, hz, yf, yn, wf, wn, yc, wc, crx, cry } = G;
  const at = (y: number) => wf + ((y - yf) / (yn - yf)) * (wn - wf);
  const kd = 0.11 * h; // the key's depth
  const kw = 0.22 * wf;
  const kwn = 0.22 * at(yf + kd);
  const trees = [-0.44, -0.3, -0.12, 0.16, 0.34, 0.47].map((t, i) => ({ x: t * w, r: (0.024 + (i % 3) * 0.008) * Math.max(w, 700) }));
  const sign = { x: -(G.phone ? 0.36 : 0.36) * w, y: hz + 0.05 * h };
  return (
    <svg className="fm-park" viewBox={`${-w / 2} ${-h / 2} ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="fm-lawn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfe6cf" />
          <stop offset="1" stopColor="#8fd2ab" />
        </linearGradient>
        <linearGradient id="fm-clay" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6c9ad" />
          <stop offset="1" stopColor="#f1a982" />
        </linearGradient>
        <radialGradient id="fm-sunlight" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform={`translate(${-0.3 * w} ${hz - 0.06 * h}) scale(${0.32 * w} ${0.22 * h})`}>
          <stop offset="0" stopColor="#fff3dc" stopOpacity="1" />
          <stop offset="0.35" stopColor="#ffd9b0" stopOpacity=".7" />
          <stop offset="1" stopColor="#ffd9b0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x={-w / 2} y={-h / 2} width={w} height={h * 0.6} fill="url(#fm-sunlight)" />
      <rect x={-w / 2} y={hz} width={w} height={h / 2 - hz} fill="url(#fm-lawn)" />
      {/* trees on the far edge; their long shadows fall away from the low sun */}
      {trees.map((t, i) => (
        <g key={i}>
          <ellipse cx={t.x + t.r * 2.2} cy={hz + 4} rx={t.r * 2.4} ry={t.r * 0.22} fill="rgb(10 70 50 / .14)" />
          <rect x={t.x - 2} y={hz - t.r * 0.9} width={4} height={t.r * 0.9 + 4} fill="#3f8a6a" />
          <circle cx={t.x} cy={hz - t.r * 1.5} r={t.r} fill={i % 2 ? "#5fb98f" : "#4eaa82"} />
          <circle cx={t.x - t.r * 0.3} cy={hz - t.r * 1.75} r={t.r * 0.45} fill="rgb(255 255 255 / .16)" />
        </g>
      ))}
      {/* the court */}
      <path d={`M${-wf} ${yf} L${wf} ${yf} L${wn} ${yn} L${-wn} ${yn} Z`} fill="url(#fm-clay)" />
      <g fill="none" stroke="#fff" strokeOpacity=".92" strokeWidth={G.phone ? 1.6 : 2.4} strokeLinejoin="round">
        <path d={`M${-wf * 0.94} ${yf + 0.006 * h} L${wf * 0.94} ${yf + 0.006 * h} L${wn * 0.94} ${yn} M${-wf * 0.94} ${yf + 0.006 * h} L${-wn * 0.94} ${yn}`} />
        <path d={`M${-wc * 0.94} ${yc} L${wc * 0.94} ${yc}`} />
        <ellipse cx={0} cy={yc} rx={crx} ry={cry} />
        <path d={`M${-kw} ${yf + 0.006 * h} L${-kwn} ${yf + kd} L${kwn} ${yf + kd} L${kw} ${yf + 0.006 * h}`} />
        <path d={`M${-kwn} ${yf + kd} A ${kwn} ${kwn * 0.3} 0 0 0 ${kwn} ${yf + kd}`} />
      </g>
      {/* the hoop, its shadow long across the court */}
      <path d={`M0 ${yf} L${0.2 * w} ${yf + 0.07 * h} L${0.2 * w + 6} ${yf + 0.068 * h} L4 ${yf - 1} Z`} fill="rgb(120 50 20 / .16)" />
      <rect x={-2.5} y={yf - 0.15 * h} width={5} height={0.15 * h} rx={2} fill="#4a5466" />
      <rect x={-0.13 * wf} y={yf - 0.2 * h} width={0.26 * wf} height={0.075 * h} rx={3} fill="#fff" stroke="#4a5466" strokeWidth={2} />
      <rect x={-0.05 * wf} y={yf - 0.172 * h} width={0.1 * wf} height={0.035 * h} fill="none" stroke="var(--pods-ember)" strokeWidth={2} />
      <ellipse cx={0} cy={yf - 0.128 * h} rx={0.06 * wf} ry={0.012 * h} fill="none" stroke="var(--pods-ember)" strokeWidth={3} />
      {/* the park sign */}
      <g transform={`translate(${sign.x} ${sign.y})`}>
        <ellipse cx={G.phone ? 70 : 92} cy={30} rx={G.phone ? 70 : 92} ry={4} fill="rgb(10 70 50 / .12)" />
        <rect x={-48} y={-6} width={3} height={36} fill="#6b5a4a" />
        <rect x={45} y={-6} width={3} height={36} fill="#6b5a4a" />
        <rect x={-58} y={-24} width={116} height={30} rx={5} fill="#fffaf2" stroke="#2f7d5c" strokeWidth={1.5} />
        <text x={0} y={-11} textAnchor="middle" className="fm-sign-t">
          {PLACE}
        </text>
        <text x={0} y={1} textAnchor="middle" className="fm-sign-s">
          Sat 10am
        </text>
      </g>
    </svg>
  );
}

function Saturday() {
  const [ref, p] = useChapter(0.8);
  const scene = useTransform(p, [0, 1], [1, 1.04]);
  return (
    <Chapter i={4} sref={ref} label="Saturday" tone="light" sky="morning" className="fm-sat">
      <motion.div className="fm-park-w" style={{ scale: scene }}>
        <Park />
        <O>
          {[1, 2, 3, 0].map((k) => (
            <Walker key={k} p={p} k={k} />
          ))}
        </O>
      </motion.div>
      <div className="fm-copy fm-copy-top">
        <Line p={p} at={[0.2, 0.3, 0.86, 0.94]} className="fm-h2">
          Saturday.
          <br />
          <span className="fm-dim">Everyone came.</span>
        </Line>
      </div>
    </Chapter>
  );
}

/* ── 6 · Safe by design: the same spot, seen on a map; three quiet proofs around you ────────────────────── */
function Safe() {
  const G = useGeo();
  const [ref, p] = useChapter(0.8);
  const [mx, my, md] = G.youMeet;
  const ver = useTransform(p, [0.14, 0.24], [0, 1]);
  const pin = useTransform(p, [0.3, 0.4], [0, 1]);
  const pinY = useTransform(p, [0.3, 0.4], [-18, 0]);
  const chk = useTransform(p, [0.46, 0.56], [0, 1]);
  const note = useTransform(p, [0.62, 0.72], [0, 1]);
  // the map steps back as the weeks arrive, so the hand-off reads as one picture
  const mapO = useTransform(p, [0.9, 1], [1, 0.35]);
  const pinX = mx - (G.phone ? 0.3 : 0.24) * G.mw;
  // map, in card coordinates (the park sits where the court was)
  const cx = G.mw / 2;
  const cy = G.mh / 2;
  const pk = { x: cx + (mx + pinX) / 2 - G.Mc.x, y: cy + G.yc - G.Mc.y };
  return (
    <Chapter i={5} sref={ref} label="Safe by design" tone="light" sky="day" className="fm-safe">
      <div className="fm-copy fm-copy-top">
        <Line p={p} at={[0.04, 0.12, 0.88, 0.96]} className="fm-h2">
          Safe by design.
        </Line>
      </div>
      <O>
        <motion.div className="fm-map fm-at" style={{ left: G.Mc.x, top: G.Mc.y, width: G.mw, height: G.mh, opacity: mapO }}>
          <svg viewBox={`0 0 ${G.mw} ${G.mh}`} width={G.mw} height={G.mh}>
            <g stroke="#fff" strokeWidth={10} strokeLinecap="round" fill="none">
              <path d={`M-10 ${G.mh * 0.22} L${G.mw + 10} ${G.mh * 0.3}`} />
              <path d={`M${G.mw * 0.18} -10 L${G.mw * 0.12} ${G.mh + 10}`} />
              <path d={`M${G.mw * 0.82} -10 L${G.mw * 0.9} ${G.mh + 10}`} />
            </g>
            <g stroke="#fff" strokeWidth={5} strokeLinecap="round" fill="none" opacity=".8">
              <path d={`M-10 ${G.mh * 0.9} L${G.mw + 10} ${G.mh * 0.86}`} />
              <path d={`M${G.mw * 0.5} -10 L${G.mw * 0.52} ${G.mh * 0.26}`} />
            </g>
            <ellipse cx={pk.x} cy={pk.y} rx={G.mw * 0.3} ry={G.mh * 0.24} fill="#bfe8d0" />
            <rect x={pk.x - G.mw * 0.06} y={pk.y - G.mh * 0.05} width={G.mw * 0.12} height={G.mh * 0.1} rx={3} fill="#f6c9ad" stroke="#fff" strokeWidth={1.5} />
          </svg>
        </motion.div>
        {/* public place: a pin on the park */}
        <motion.div className="fm-pin fm-at" style={{ left: pinX, top: G.yc - 14, opacity: pin, y: pinY }}>
          <i />
        </motion.div>
        <motion.span className="fm-chip fm-at" style={{ left: pinX, top: G.yc - 62, opacity: pin }}>
          Public place
        </motion.span>
        {/* check-in: a slow pulse around you */}
        <motion.i className="fm-pulse fm-at" style={{ left: mx, top: my, width: md * 2.6, height: md * 2.6, opacity: chk }} />
        <LocalMe x={mx} y={my} d={md} />
        {/* verified: a check on you */}
        <motion.i className="fm-check fm-at" style={{ left: mx + md * 0.42, top: my - md * 0.42, opacity: ver }} />
        <motion.span className="fm-chip fm-at" data-a="left" style={{ left: mx + md * 0.9, top: my, opacity: ver }}>
          Verified
        </motion.span>
        <motion.span className="fm-chip fm-at" style={{ left: mx, top: my + md * 1.7, opacity: chk }}>
          Checked in
        </motion.span>
      </O>
      <div className="fm-copy fm-copy-bottom">
        <motion.p className="fm-cap" style={{ opacity: note }}>
          Report or block in one tap, privately.
        </motion.p>
      </div>
    </Chapter>
  );
}

/* ── 7 · Repeat: the weeks step past, the hours add up, and then they text you first ───────────────────── */
function Venn({ sp, rv, glow }: { sp: number; rv: number; glow?: boolean }) {
  return (
    <div className="fm-venn" style={{ "--r": `${rv}px` } as CSSProperties}>
      {HUES.map((h) => (
        <i key={h} data-h={h} style={{ translate: `${MARK[h][0] * rv * sp}px ${MARK[h][1] * rv * sp}px` }}>
          <b data-you={h === "ember" && glow ? "" : undefined} style={{ translate: `${MDOT[h][0] * rv}px ${MDOT[h][1] * rv}px` }} />
        </i>
      ))}
    </div>
  );
}

function Week({ p, i, wk }: { p: MotionValue<number>; i: number; wk: (typeof WEEKS)[number] }) {
  const G = useGeo();
  const step = G.cw + G.gap;
  const off = useTransform(p, (x) => i * step - weekAt(x).s * step);
  const gt = useTransform(p, gatherAt);
  // cards gather to the centre as the strip ends; the last one's circles become the big overlap
  const near = useTransform(off, (o) => clamp(1 - Math.abs(o) / step, 0, 1));
  const o = useTransform([off, gt] as MotionValue<number>[], ([of, t]: number[]) => clamp(1.15 - Math.abs(of) / (step * 2.4), 0.2, 1) * (1 - clamp(t * (i === 7 ? 1.6 : 3), 0, 1)));
  const scale = useTransform([near, gt] as MotionValue<number>[], ([n, t]: number[]) => (0.9 + 0.1 * n) * (1 - 0.2 * t));
  return (
    <motion.article className="fm-week fm-at" style={{ left: 0, top: G.Ty, x: off, scale, opacity: o, width: G.cw, height: G.ch, "--cw": `${G.cw}px` } as unknown as CSSProperties}>
      <header>
        <small>{wk.w}</small>
        <span>{wk.came} of 8 came</span>
      </header>
      <div className="fm-week-v" style={{ top: G.vy - G.Ty + G.ch / 2 }}>
        <Venn sp={G.sp(i)} rv={G.rv} glow />
      </div>
      <b>{wk.what}</b>
      <div className="fm-hrs">
        <i style={{ width: `${(wk.hrs / 50) * 100}%` }} />
      </div>
      <span className="fm-hrs-l">{wk.hrs === 50 ? "50 hours together" : `${wk.hrs} of ~50 hours together`}</span>
    </motion.article>
  );
}

function Repeat() {
  const G = useGeo();
  const [ref, p] = useChapter(0.86);
  const gt = useTransform(p, gatherAt);
  // the payoff: one deep overlap (the last week's circles, grown), you at its top dot, and a text from Tobi
  const fx = useTransform(gt, [0, 1], [0, G.Vf.x]);
  const fy = useTransform(gt, [0, 1], [G.vy, G.Vf.y]);
  const fs = useTransform(gt, [0, 1], [G.rv / G.rvF, 1]);
  const fo = useTransform(p, [0.6, 0.64], [0, 1]);
  const msg = useTransform(p, [0.76, 0.82], [0, 1]);
  const msgY = useTransform(p, [0.76, 0.82], [12, 0]);
  const bub = G.phone ? { left: 0, top: G.Vf.y + G.rvF * 1.9, translate: "-50% 0" } : { left: G.Vf.x + G.rvF * 2.2, top: G.Vf.y - 6, translate: "0 -50%" };
  return (
    <Chapter i={6} sref={ref} label="Repeat" tone="light" sky="evening" className="fm-repeat">
      <div className="fm-copy fm-copy-top">
        <Line p={p} at={[0.03, 0.1, 0.56, 0.62]} className="fm-h2">
          Again next week.
          <br />
          <span className="fm-dim">And the week after.</span>
        </Line>
        <Line p={p} at={[0.06, 0.13, 0.56, 0.62]} as="p" className="fm-sub">
          Friends take about 50 hours. Nobody asks for hangout #2, so Pods does.
        </Line>
      </div>
      <div className="fm-copy fm-copy-top" data-tone="dark">
        <Line p={p} at={[0.66, 0.74, 0.96, 1.01]} className="fm-h2">
          Fifty hours later,
          <br />
          <span className="fm-dim">they text you first.</span>
        </Line>
      </div>
      <O>
        {WEEKS.map((wk, i) => (
          <Week key={wk.w} p={p} i={i} wk={wk} />
        ))}
        <motion.div className="fm-at" style={{ left: 0, top: 0, x: fx, y: fy, scale: fs, opacity: fo }}>
          <Venn sp={1} rv={G.rvF} />
        </motion.div>
        <motion.div className="fm-bubble fm-at" style={{ ...bub, opacity: msg, y: msgY }}>
          <i />
          <p>
            <b>Tobi</b>
            Anyone free tonight?
          </p>
        </motion.div>
      </O>
    </Chapter>
  );
}

/* ── 8 · Close: the overlap becomes the mark, the city comes back lit; home ─────────────────────────────── */
function CloseSphere({ p, h }: { p: MotionValue<number>; h: Hue }) {
  const G = useGeo();
  const [mx, my] = MARK[h];
  const keys: Key[] = [[0, G.Vf.x + mx * G.rvF, G.Vf.y + my * G.rvF, G.rvF / G.rr], [0.4, G.Cm.x + mx * G.rr, G.Cm.y + my * G.rr, 1]];
  const x = useTrack(p, keys, 0);
  const y = useTrack(p, keys, 1);
  const scale = useTrack(p, keys, 2);
  const opacity = useTransform(p, [0, 0.12], [0.4, 1]);
  return (
    <motion.div className="fm-at" style={{ x, y, scale, opacity, width: G.rr * 2, height: G.rr * 2 }}>
      <PodSphere hue={SPHERE[h]} people={1} inCount={1} you={false} size={G.rr * 2} />
    </motion.div>
  );
}

function Close() {
  const G = useGeo();
  const [ref, p] = useChapter(1);
  const cityO = useTransform(p, [0.15, 0.55], [0, 0.9]);
  const cityY = useTransform(p, [0.15, 0.7], ["12%", "0%"]);
  const word = useTransform(p, [0.4, 0.55], [0, 1]);
  const wordY = useTransform(p, [0.4, 0.55], [16, 0]);
  const cta = useTransform(p, [0.52, 0.64], [0, 1]);
  const ctaY = useTransform(p, [0.52, 0.64], [16, 0]);
  return (
    <Chapter i={7} sref={ref} label="Find your people" tone="dark" sky="evening" className="fm-close">
      <motion.div className="fm-city fm-city-home" style={{ opacity: cityO, y: cityY }} aria-hidden>
        <div className="fm-city-l">
          <Skyline b={FAR} tone="far" />
        </div>
        <div className="fm-city-l">
          <Skyline b={MID} tone="mid" />
        </div>
      </motion.div>
      <O>
        {(["signal", "grove", "ember"] as Hue[]).map((h) => (
          <CloseSphere key={h} p={p} h={h} />
        ))}
        <LocalMe x={G.Cm.x} y={G.Cm.y - (0.78 + 0.6) * G.rr} d={0.36 * G.rr} />
      </O>
      <div className="fm-close-in" style={{ top: `calc(50% + ${G.Cm.y + G.rr * 1.5 + 36}px)` }}>
        <motion.div style={{ opacity: word, y: wordY }}>
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
