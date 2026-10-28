// Landing: you are expected. One path draws itself from three clearings to you (AW 04, 06, 12 "seat, not hero";
// CM 140 "the path is made by walking"). Scroll wears the same path in: Once. Again. Worn in. (PB 2.4, 4.4)
// One action, fixed in the bottom-right clear zone (PB 1.2). Words above the fold: 9.
"use client";

import { motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { edge, trail, useSize, type Pt } from "./geometry";
import { Onward } from "./icons";
import { Disc, Logo, Paper } from "./Shell";
import { usePaths, usePathsReady } from "./store";

export function Landing() {
  const router = useRouter();
  const ready = usePathsReady();
  const promised = usePaths((s) => s.promised);
  const go = () => router.push(ready && promised ? "/concepts/paths/home" : "/concepts/paths/begin");

  return (
    <Paper>
      <Hero />
      <Wear />
      <div style={{ position: "fixed", right: "var(--m)", bottom: "max(var(--m), env(safe-area-inset-bottom))", zIndex: 20 }}>
        <button className="pth-cta" onClick={go} data-primary>
          Find my pods <Onward size={20} />
        </button>
      </div>
    </Paper>
  );
}

function Hero() {
  const [ref, size] = useSize<HTMLDivElement>();
  return (
    <section ref={ref} style={{ position: "relative", height: "100dvh", minHeight: 640, overflow: "hidden" }}>
      {size && <HeroField w={size.w} h={size.h} />}
      <header style={{ position: "absolute", top: "calc(var(--m) - 6px)", left: "var(--m)", zIndex: 2 }}>
        <Logo size={26} />
      </header>
      <div style={{ position: "absolute", left: "var(--m)", top: "clamp(112px, 17vh, 200px)", zIndex: 2, maxWidth: 720 }}>
        <motion.p
          className="pth-label"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          style={{ margin: 0, color: "var(--ink-2)" }}
        >
          Find your people.
        </motion.p>
        <motion.h1
          className="pth-serif pth-big"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
          style={{ margin: "12px 0 0", fontSize: "clamp(68px, 17.5vw, 152px)" }}
        >
          Then keep
          <br />
          <span className="pth-serif-i">them.</span>
        </motion.h1>
      </div>
    </section>
  );
}

function HeroField({ w, h }: { w: number; h: number }) {
  const desk = w >= 900;
  const you: Pt = desk ? { x: 96, y: h - 110 } : { x: 44, y: h - 128 };
  const pods: { c: Pt; r: number; hue: string }[] = desk
    ? [
        { c: { x: w * 0.74, y: h * 0.4 }, r: 150, hue: "ember" },
        { c: { x: w * 0.93, y: h * 0.72 }, r: 96, hue: "signal" },
        { c: { x: w * 0.5, y: h * 0.86 }, r: 60, hue: "grove" },
      ]
    : [
        { c: { x: w * 0.86, y: h * 0.55 }, r: 92, hue: "ember" },
        { c: { x: w * 0.64, y: h * 0.79 }, r: 38, hue: "grove" },
        { c: { x: w * 0.98, y: h * 0.32 }, r: 58, hue: "signal" },
      ];
  const paths = pods.map((p, i) => trail(you, edge(you, p.c, p.r + 6), i === 0 ? 0.32 : i === 1 ? -0.18 : 0.12));
  return (
    <svg width={w} height={h} style={{ position: "absolute", inset: 0 }} aria-hidden>
      {pods.map((p, i) => (
        <g key={i} className="pth-fade" style={{ ["--delay" as string]: `${200 + i * 260}ms` }}>
          <circle cx={p.c.x} cy={p.c.y} r={p.r} fill={`var(--${p.hue})`} opacity={0.9} style={{ mixBlendMode: "multiply" }} />
          <circle cx={p.c.x} cy={p.c.y} r={p.r + 10} fill="none" stroke={`var(--${p.hue})`} strokeOpacity={0.22} strokeWidth={1} />
        </g>
      ))}
      {paths.map((d, i) => (
        <g key={i}>
          {i === 0 && <path d={d} fill="none" stroke="var(--ink)" strokeOpacity={0.06} strokeWidth={16} strokeLinecap="round" className="pth-draw" style={{ ["--len" as string]: 1800, ["--delay" as string]: "900ms" }} />}
          <path
            id={i === 0 ? "pth-hero-trail" : undefined}
            d={d}
            fill="none"
            stroke="var(--ink)"
            strokeOpacity={i === 0 ? 0.8 : 0.42}
            strokeWidth={i === 0 ? 2 : 1.25}
            strokeDasharray={i === 0 ? undefined : "2 7"}
            strokeLinecap="round"
            className={i === 0 ? "pth-draw" : "pth-fade"}
            style={{ ["--len" as string]: 1800, ["--delay" as string]: `${900 + i * 250}ms` }}
          />
        </g>
      ))}
      <text className="pth-fade" style={{ ["--delay" as string]: "1900ms", font: "italic 400 22px var(--p-serif)", fill: "var(--ink)" }} dy={-12}>
        <textPath href="#pth-hero-trail" startOffset={desk ? "9%" : "13%"}>This way.</textPath>
      </text>
      <foreignObject x={you.x - 24} y={you.y - 24} width={48} height={74}>
        <div style={{ display: "grid", justifyItems: "center", gap: 4 }}>
          <Disc initial="" size={48} />
          <span className="pth-cap">you</span>
        </div>
      </foreignObject>
    </svg>
  );
}

/** Scroll: the same path, walked three times. Stroke deepens; the word changes. No cards, no feature list. */
function Wear() {
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const [stage, setStage] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => setStage(v < 0.45 ? 0 : v < 0.75 ? 1 : 2));
  const halo = useTransform(scrollYProgress, [0.3, 1], [0, 34]);
  const sw = useTransform(scrollYProgress, [0.3, 1], [1.25, 6]);
  const words = ["Once.", "Again.", "Worn in."];
  const [box, size] = useSize<HTMLDivElement>();
  const w = size?.w ?? 390;
  const h = size?.h ?? 844;
  const desk = w >= 900;
  const a: Pt = { x: desk ? 96 : 44, y: h * (desk ? 0.8 : 0.74) };
  const c: Pt = { x: w * (desk ? 0.76 : 0.78), y: h * (desk ? 0.5 : 0.52) };
  const r = desk ? 120 : 70;
  const d = trail(a, edge(a, c, r + 6), 0.3);
  return (
    <section ref={ref} style={{ position: "relative", height: "300dvh" }}>
      <div ref={box} style={{ position: "sticky", top: 0, height: "100dvh", overflow: "hidden" }}>
        {size && (
          <svg width={w} height={h} style={{ position: "absolute", inset: 0 }} aria-hidden>
            <circle cx={c.x} cy={c.y} r={r} fill="var(--ember)" opacity={0.9} style={{ mixBlendMode: "multiply" }} />
            <motion.path d={d} fill="none" stroke="var(--ink)" strokeOpacity={0.07} strokeLinecap="round" style={{ strokeWidth: halo }} />
            <motion.path d={d} fill="none" stroke="var(--ink)" strokeOpacity={0.85} strokeLinecap="round" strokeDasharray={stage === 0 ? "2 7" : undefined} style={{ strokeWidth: sw }} />
            <circle cx={a.x} cy={a.y} r={24} fill="var(--ink)" />
          </svg>
        )}
        <div style={{ position: "absolute", left: "var(--m)", top: "clamp(96px, 16vh, 160px)" }}>
          <motion.p key={stage} className="pth-serif pth-huge" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }} style={{ margin: 0, fontSize: "clamp(84px, 22vw, 200px)" }}>
            {words[stage]}
          </motion.p>
        </div>
      </div>
    </section>
  );
}
