// <ProductStory />: the landing scroll story, redone after the founder's verdict on the pinned slideshow
// (MOTION_SYSTEM §3). The page scrolls normally; each scene is a finished composition that assembles as it enters
// (CSS view timelines, compositor-only, static where unsupported). ONE short pinned moment: the lock.
// The story is told with the product, and the logo's people (white dots) are the people in it:
//   1 People   three dots arrive alone; a world (bubble) grows around each           "Everyone starts new."
//   2 Fit      the worlds drift together and overlap; your pods name themselves      "Pods finds who fits."
//   3 Plan     the plan card assembles, row by row, under its halo                    "AI plans the first hangout."
//   4 Lock     (pinned, ~1.6 screens) 3 of 8 in -> your bubble takes a seat -> 4 of 8 -> the ring closes -> Locked
//   5 Repeat   "Run it back?" four yes votes pop; same people, two weeks later; the mark assembles, the period lands
// Scroll triggers steps; time animates them (springs), so every still frame is finished. No scroll-jacking.
// Reduced motion: no pin, final states shown, cross-fades only. Nothing here is a control (no dead UI on the page).
"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useMotionValueEvent, useScroll } from "motion/react";
import { Bubble } from "./bubble";
import { LogoAnimated } from "./logo-animated";
import { PlanHalo } from "./plan-halo";
import { InCount } from "./in-count";
import { GENTLE, SNAPPY, STAGGER, useCalmMotion } from "./motion";
import { cn } from "@/lib/cn";
import "./product-story.css";

export function ProductStory({ className }: { className?: string }) {
  return (
    <div className={cn("ps", className)}>
      <People />
      <Fit />
      <Plan />
      <Lock />
      <Repeat />
    </div>
  );
}

function Copy({ line, sub, i = 0 }: { line: React.ReactNode; sub?: React.ReactNode; i?: number }) {
  return (
    <div className="ps-copy">
      <h2 className="ps-line ps-in" style={{ ["--i" as string]: i }}>{line}</h2>
      {sub && <p className="ps-sub ps-in" style={{ ["--i" as string]: i + 1 }}>{sub}</p>}
    </div>
  );
}

/* 1. Three people, each alone; a world grows around each dot as it scrolls in. */
function People() {
  return (
    <section className="ps-scene ps-people" aria-label="Everyone starts new">
      <Copy line="Everyone starts new." sub="Three people, all new in town." />
      <div className="ps-obj ps-trio-apart" aria-hidden>
        {(["ember", "signal", "grove"] as const).map((h, i) => (
          <span key={h} className="ps-grow" style={{ ["--i" as string]: i }}>
            <Bubble hue={h} size="var(--b)" dot="center" buoy={i * 1.7} solo />
          </span>
        ))}
      </div>
    </section>
  );
}

/* 2. The worlds drift into the logo's overlap (scroll-linked), and four pods name themselves around it. */
const PODS = [
  { name: "Hoopers", hue: "ember" },
  { name: "Strings", hue: "ember" },
  { name: "Southern African", hue: "grove" },
  { name: "Adventist young adults", hue: "grove" },
] as const;

function Fit() {
  return (
    <section className="ps-scene ps-fit" aria-label="Pods finds who fits">
      <Copy line="Pods finds who fits." sub="By what you love and when you're free." />
      <div className="ps-obj ps-fitobj">
        <div className="ps-venn" aria-hidden>
          <span className="ps-drift" data-h="ember"><Bubble hue="ember" size="var(--v)" dot="top" /></span>
          <span className="ps-drift" data-h="signal"><Bubble hue="signal" size="var(--v)" dot="left" /></span>
          <span className="ps-drift" data-h="grove"><Bubble hue="grove" size="var(--v)" dot="right" /></span>
        </div>
        <ul className="ps-pods">
          {PODS.map((p, i) => (
            <li key={p.name} className="ps-pod ps-in" data-hue={p.hue} style={{ ["--i" as string]: i + 1 }}>
              <i aria-hidden />
              {p.name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* 3. The plan card, assembling row by row under the halo. Looks like the app; it is not a control. */
function Plan() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.5 });
  return (
    <section className="ps-scene ps-plan" aria-label="AI plans the first hangout">
      <Copy line="AI plans the first hangout." sub="A time that works. A public place." />
      <div className="ps-obj" ref={ref}>
        <PlanHalo state={seen ? "waiting" : "off"} radius={28} className="ps-card-wrap">
          <PlanCard n={3} />
        </PlanHalo>
      </div>
    </section>
  );
}

function PlanCard({ n, locked }: { n: number; locked?: boolean }) {
  return (
    <div className="ps-card">
      <p className="ps-card-over ps-in" style={{ ["--i" as string]: 0 }}>
        <span>Hoopers</span>
        <span className="ps-ai">Planned by AI</span>
      </p>
      <p className="ps-card-when ps-in tabular" style={{ ["--i" as string]: 1 }}>Saturday, 10am</p>
      <p className="ps-card-what ps-in" style={{ ["--i" as string]: 2 }}>Pickup basketball</p>
      <p className="ps-card-where ps-in" style={{ ["--i" as string]: 3 }}>Miller Playfield · Free</p>
      <div className="ps-card-foot ps-in" style={{ ["--i" as string]: 4 }}>
        <span className="ps-seats" aria-hidden>
          {[0, 1, 2, 3].map((s) => (
            <i key={s} data-on={s < n ? "" : undefined} data-you={s === 3 && n > 3 ? "" : undefined} />
          ))}
        </span>
        <InCount n={n} of={8} locked={locked} className="text-[15px]" />
      </div>
    </div>
  );
}

/* 4. The one pinned moment: the lock. Scroll picks the step; springs animate it. */
const SEATS = 8;
const SEATED: { hue: "ember" | "signal" | "grove"; seat: number }[] = [
  { hue: "signal", seat: 0 },
  { hue: "grove", seat: 1 },
  { hue: "signal", seat: 2 },
];
// seats fill clockwise from the top so the ring's arc runs exactly under the people who are in
const YOU_SEAT = 3;

function Lock() {
  const calm = useCalmMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [step, setStep] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (p) => setStep(p < 0.28 ? 0 : p < 0.62 ? 1 : 2));
  const s = calm ? 2 : step;
  const n = s >= 1 ? 4 : 3;
  const locked = s >= 2;

  return (
    <section ref={ref} className="ps-lock" data-calm={calm ? "" : undefined} aria-label="Four say I'm in. Locked.">
      <div className="ps-lock-stage">
        <div className="ps-copy ps-lock-copy">
          <AnimatePresence mode="wait" initial={false}>
            <motion.h2
              key={locked ? "on" : "in"}
              className="ps-line"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {locked ? "It's on." : "Four say I'm in."}
            </motion.h2>
          </AnimatePresence>
          <InCount n={n} of={SEATS} locked={locked} className="ps-lock-count" />
        </div>

        <div className="ps-table" aria-hidden data-locked={locked ? "" : undefined}>
          <svg className="ps-ring" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" className="ps-ring-base" />
            <motion.circle
              cx="50"
              cy="50"
              r="46"
              className="ps-ring-close"
              initial={false}
              animate={{ pathLength: locked ? 1 : n / SEATS }}
              transition={calm ? { duration: 0 } : GENTLE}
            />
          </svg>
          {Array.from({ length: SEATS }, (_, i) => {
            const who = SEATED.find((x) => x.seat === i);
            const you = i === YOU_SEAT;
            return (
              <span key={i} className="ps-seat" style={{ ["--a" as string]: `${(i / SEATS) * 360 - 90}deg` }}>
                {who ? (
                  <Bubble hue={who.hue} size="var(--s)" dot="center" settle={locked} solo />
                ) : you ? (
                  <AnimatePresence>
                    {n >= 4 && (
                      <motion.span
                        className="ps-you"
                        initial={calm ? false : { y: 90, scale: 0.6, opacity: 0 }}
                        animate={{ y: 0, scale: 1, opacity: 1 }}
                        transition={{ ...SNAPPY, delay: STAGGER }}
                      >
                        <Bubble hue="ember" size="var(--s)" dot="center" settle={locked} solo />
                      </motion.span>
                    )}
                  </AnimatePresence>
                ) : (
                  <i className="ps-empty" />
                )}
              </span>
            );
          })}
          <span className="ps-table-mid">
            <span className="tabular">Sat 10am</span>
          </span>
        </div>
      </div>
    </section>
  );
}

/* 5. Run it back: the vote pops in, then the mark assembles and the period lands. */
function Repeat() {
  const voteRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const voted = useInView(voteRef, { once: true, amount: 0.6 });
  const markIn = useInView(markRef, { once: true, amount: 0.6 });
  const calm = useCalmMotion();
  const yes = voted || calm ? 4 : 0;
  return (
    <section className="ps-scene ps-repeat" aria-label="Run it back">
      <Copy line="Then the pod meets again." sub="Same people. Two weeks later." />
      <div className="ps-obj" ref={voteRef}>
        <div className="ps-vote">
          <p className="ps-vote-q">Run it back?</p>
          <div className="ps-vote-row">
            <span className="ps-vote-discs" aria-hidden>
              {(["signal", "grove", "signal", "ember"] as const).map((h, i) => (
                <motion.span
                  key={i}
                  initial={false}
                  animate={i < yes ? { scale: 1, opacity: 1 } : { scale: 0.4, opacity: 0 }}
                  transition={calm ? { duration: 0 } : { ...SNAPPY, delay: 0.25 + i * 0.18 }}
                >
                  <Bubble hue={h} size={36} dot="center" solo />
                </motion.span>
              ))}
            </span>
            <span className="ps-vote-n tabular">{yes} of 4 yes</span>
          </div>
          <p className="ps-vote-next" data-on={yes === 4 ? "" : undefined}>Hangout #2 is on.</p>
        </div>
      </div>
      <div className="ps-close" ref={markRef}>
        {markIn ? <LogoAnimated variant="intro" className="ps-close-logo" title="Pods" /> : <span className="ps-close-logo" />}
        <p className="ps-close-line">
          <span>Find your people.</span> <b>Then keep them.</b>
        </p>
      </div>
    </section>
  );
}
