// First steps. Each answer is a footstep on your first path (PB 2.7; SF 19, 24): progress without a stepper.
// Question top-left, input in the open field, one capsule bottom-right (PB 1.2; TS 8, 5, 49). ≤ 9 words per step.
"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Slot } from "@/lib/types";
import { COMMUNITY, DAYS, STONES } from "./data";
import { edge, trail, useSize, type Pt } from "./geometry";
import { Onward, PullBack } from "./icons";
import { Paper } from "./Shell";
import { usePaths, usePathsReady } from "./store";

const STEPS = ["name", "love", "free", "roots", "promise"] as const;
type StepId = (typeof STEPS)[number];

export function Begin() {
  usePathsReady();
  const router = useRouter();
  const s = usePaths();
  const [i, setI] = useState(0);
  const step: StepId = STEPS[i];

  const can =
    step === "name" ? s.name.trim().length > 0 : step === "love" ? s.interests.length > 0 : step === "free" ? s.slots.length > 0 : true;
  const next = () => {
    if (!can) return;
    if (step === "promise") {
      s.settle();
      router.push("/concepts/paths/home");
      return;
    }
    setI((n) => Math.min(n + 1, STEPS.length - 1));
  };
  const back = () => (i === 0 ? router.push("/concepts/paths") : setI((n) => n - 1));
  const label = step === "promise" ? "I promise" : step === "roots" && !s.community ? "Skip" : "Next";

  return (
    <Paper>
      <main style={{ position: "relative", height: "100dvh", minHeight: 620, overflow: "hidden" }}>
        <FirstPath done={i} initial={s.name.trim().slice(0, 1).toUpperCase()} />
        <div style={{ position: "absolute", top: "calc(var(--m) - 6px)", left: "calc(var(--m) - 12px)", zIndex: 3 }}>
          <button className="pth-icon" aria-label="Back" onClick={back}><PullBack /></button>
        </div>
        <AnimatePresence mode="wait">
          <motion.section
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ position: "absolute", left: "var(--m)", right: "var(--m)", top: "clamp(100px, 15vh, 168px)", maxWidth: 680, zIndex: 2 }}
            onKeyDown={(e) => e.key === "Enter" && next()}
          >
            {step === "name" && <NameStep />}
            {step === "love" && <LoveStep />}
            {step === "free" && <FreeStep />}
            {step === "roots" && <RootsStep />}
            {step === "promise" && <PromiseStep />}
          </motion.section>
        </AnimatePresence>
        <div style={{ position: "absolute", right: "var(--m)", bottom: "max(var(--m), env(safe-area-inset-bottom))", zIndex: 3 }}>
          <button className="pth-cta" data-primary disabled={!can} onClick={next}>
            {label} <Onward size={20} />
          </button>
        </div>
      </main>
    </Paper>
  );
}

function Q({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <header style={{ marginBottom: "var(--s8)" }}>
      <h1 className="pth-serif pth-head" style={{ margin: 0, maxWidth: "11ch" }}>{children}</h1>
      {sub && <p className="pth-cap" style={{ margin: "var(--s2) 0 0" }}>{sub}</p>}
    </header>
  );
}

function NameStep() {
  const name = usePaths((s) => s.name);
  const set = usePaths((s) => s.set);
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);
  return (
    <>
      <Q>What should they call you?</Q>
      <label className="pth-sr" htmlFor="pth-name">First name</label>
      <input
        id="pth-name"
        ref={ref}
        className="pth-input"
        value={name}
        maxLength={24}
        autoComplete="given-name"
        placeholder="First name"
        onChange={(e) => set({ name: e.target.value })}
        style={{ maxWidth: 420 }}
      />
    </>
  );
}

/** Stepping stones: words lying loose in the field (AW 37, 36), not a chip grid (MB: Reddit, X, Bumble). */
const OFFSET = [0, 36, 8, 52, 18, 0, 44, 10, 30, 4];
function LoveStep() {
  const interests = usePaths((s) => s.interests);
  const set = usePaths((s) => s.set);
  const toggle = (id: string) => {
    const has = interests.includes(id);
    if (!has && interests.length >= 3) return;
    set({ interests: has ? interests.filter((x) => x !== id) : [...interests, id] });
  };
  const hueOf = (id: string) => ["ember", "signal", "grove"][interests.indexOf(id)] ?? "ember";
  return (
    <>
      <Q sub="Up to 3">What do you love doing?</Q>
      <div style={{ display: "flex", flexWrap: "wrap", columnGap: 20, rowGap: 2, maxWidth: "clamp(320px, 52vw, 720px)" }}>
        {STONES.map((st, k) => (
          <button
            key={st.id}
            className="pth-stone"
            aria-pressed={interests.includes(st.id)}
            data-hue={hueOf(st.id)}
            onClick={() => toggle(st.id)}
            style={{ marginLeft: OFFSET[k] ?? 0 }}
          >
            {st.label}
          </button>
        ))}
      </div>
    </>
  );
}

/** The weekend as two sun arcs: each day is the sun's path, and you tap where the sun is when you're free
 *  (rising, high, setting). Circle grammar (IL 40/41), not a calendar grid (MB: Reddit, Google Calendar pickers). */
function FreeStep() {
  const slots = usePaths((s) => s.slots);
  const set = usePaths((s) => s.set);
  const toggle = (sl: Slot) => set({ slots: slots.includes(sl) ? slots.filter((x) => x !== sl) : [...slots, sl] });
  return (
    <>
      <Q>When are you free?</Q>
      <div style={{ display: "grid", gap: "var(--s4)", width: "min(100%, clamp(340px, 34vw, 460px))" }}>
        {DAYS.map((d, di) => (
          <SunArc key={d.day} day={d.day} slots={d.slots} on={slots} toggle={toggle} labels={di === 0} />
        ))}
      </div>
      <button
        className="pth-stone"
        aria-pressed={slots.includes("weekday-evening")}
        onClick={() => toggle("weekday-evening")}
        style={{ marginTop: "var(--s2)", marginLeft: -6 }}
      >
        weeknights
      </button>
    </>
  );
}

function SunArc({ day, slots, on, toggle, labels }: { day: string; slots: { slot: Slot; label: string }[]; on: Slot[]; toggle: (s: Slot) => void; labels: boolean }) {
  // A shallow arc from x 72 to 332; three suns sit at rising / high / setting.
  const W = 340;
  const H = labels ? 104 : 84;
  const top = labels ? 26 : 8;
  const x0 = 76, x1 = 324, base = top + 62, peak = top + 6;
  const at = (t: number) => {
    const u = 1 - t;
    const cx = (x0 + x1) / 2;
    return { x: u * u * x0 + 2 * u * t * cx + t * t * x1, y: u * u * base + 2 * u * t * (peak - 56) + t * t * base };
  };
  const pts = [0.14, 0.5, 0.86].map(at);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={day} style={{ overflow: "visible" }}>
      <path d={`M${x0},${base} Q${(x0 + x1) / 2},${peak - 56} ${x1},${base}`} fill="none" stroke="var(--ink)" strokeOpacity={0.3} strokeWidth={1.25} strokeDasharray="2 6" strokeLinecap="round" />
      <text x={0} y={base + 4} style={{ font: "400 34px var(--p-serif)", fill: "var(--ink)" }}>{day}</text>
      {slots.map((s, k) => {
        const active = on.includes(s.slot);
        const p = pts[k];
        return (
          <g key={s.slot} role="button" tabIndex={0} aria-pressed={active} aria-label={`${day} ${s.label}`} className="pth-hit"
            onClick={() => toggle(s.slot)} onKeyDown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), toggle(s.slot))}>
            <circle cx={p.x} cy={p.y} r={24} fill="transparent" />
            <circle cx={p.x} cy={p.y} r={active ? 14 : 9} fill={active ? "var(--ink)" : "var(--paper)"} stroke="var(--ink)" strokeOpacity={active ? 1 : 0.45} strokeWidth={1.5}
              style={{ transition: "r 260ms cubic-bezier(.3,1.6,.5,1), fill 200ms" }} />
            {labels && <text x={p.x} y={p.y - 24} textAnchor="middle" style={{ font: "500 12px var(--p-sans)", fill: "var(--ink-2)" }}>{s.label}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function RootsStep() {
  const community = usePaths((s) => s.community);
  const set = usePaths((s) => s.set);
  return (
    <>
      <Q sub="Optional. Only you see this.">A community pod too?</Q>
      <div style={{ display: "flex", flexWrap: "wrap", columnGap: 20, rowGap: 2, maxWidth: 520 }}>
        {COMMUNITY.map((c, k) => (
          <button key={c.id} className="pth-stone" data-hue="grove" aria-pressed={community === c.id} onClick={() => set({ community: community === c.id ? null : c.id })} style={{ marginLeft: OFFSET[k + 2] }}>
            {c.label}
          </button>
        ))}
      </div>
    </>
  );
}

function PromiseStep() {
  return (
    <>
      <h1 className="pth-serif pth-big" style={{ margin: 0 }}>
        Show up,
        <br />
        <span className="pth-serif-i">or say so.</span>
      </h1>
      <p className="pth-cap" style={{ margin: "var(--s6) 0 0" }}>Claude plans each hangout.</p>
    </>
  );
}

/** The first path along the bottom: you (left) to an open clearing (right). Footsteps mark answered steps. */
function FirstPath({ done, initial }: { done: number; initial: string }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const pathRef = useRef<SVGPathElement | null>(null);
  const [pts, setPts] = useState<Pt[]>([]);
  const w = size?.w ?? 0;
  const h = size?.h ?? 0;
  const desk = w >= 900;
  const you: Pt = { x: desk ? 96 : 44, y: h - (desk ? 110 : 128) };
  const c: Pt = { x: w + (desk ? 10 : 30), y: h - (desk ? 330 : 300) };
  const r = desk ? 110 : 76;
  const d = size ? trail(you, edge(you, c, r + 6), 0.18) : "";
  useLayoutEffect(() => {
    const el = pathRef.current;
    if (!el || !d) return;
    const L = el.getTotalLength();
    setPts(STEPS.map((_, k) => {
      const p = el.getPointAtLength(L * (0.16 + k * 0.17));
      return { x: p.x, y: p.y };
    }));
  }, [d]);
  return (
    <div ref={ref} style={{ position: "absolute", inset: 0 }} aria-hidden>
      {size && (
        <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
          <circle cx={c.x} cy={c.y} r={r} fill="none" stroke="var(--ink)" strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="3 7" />
          <path ref={pathRef} d={d} fill="none" stroke="var(--ink)" strokeOpacity={0.35} strokeWidth={1.25} strokeDasharray="2 7" strokeLinecap="round" />
          {pts.map((p, k) => (
            <motion.circle key={k} cx={p.x} cy={p.y} initial={false} animate={{ r: k < done ? 5 : 0 }} transition={{ type: "spring", stiffness: 420, damping: 18 }} fill="var(--ink)" />
          ))}
          <circle cx={you.x} cy={you.y} r={24} fill="var(--ink)" />
          <text x={you.x} y={you.y + 7} textAnchor="middle" style={{ font: "600 19px var(--p-sans)", fill: "var(--paper)" }}>{initial}</text>
        </svg>
      )}
    </div>
  );
}
