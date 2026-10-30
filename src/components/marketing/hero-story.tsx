// <HeroStory />: the landing's one pinned scene (round 1029, founder: "the scroll animation has more to be desired").
// Natural scroll, no snapping: a sticky stage ~2.4 screens tall. One scroll value drives everything, so the circles and
// the product arrive in sync:
//   apart (three people, new in town) -> the circles move together into a pod -> the AI's plan card arrives ->
//   I'm in (3 -> 4 of 8) -> Locked (the circles settle closer, a small squash) -> two weeks later: run it back.
// Pointer tilts the glossy circles (mouse only). Transform/opacity only. Reduced motion: no pin, the finished state.
"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { formatInTimeZone } from "date-fns-tz";
import { useCalmMotion } from "@/components/brand/motion";
import { InCount } from "@/components/brand/in-count";
import { Button } from "@/components/ui/button";
import { DEMO } from "@/config/demo";
import { PLAN_FACTS } from "./story";
import { Orbs } from "./orbs";
import "./hero-story.css";

const TIME = formatInTimeZone(DEMO.hoopers.starts_at, "America/Los_Angeles", "haaa").toLowerCase();

const STEPS = [
  { k: "Fit", line: "Three people, new in town." },
  { k: "Pod", line: "Pods puts you in a small group that fits." },
  { k: "Plan", line: "AI plans the first hangout." },
  { k: "I'm in", line: "You tap I'm in." },
  { k: "I'm in", line: "Hoopers locks at 4. Four in. It's on." },
  { k: "Repeat", line: "Two weeks later, the pod picks the next one." },
] as const;
const RAIL = ["Fit", "Pod", "Plan", "I'm in", "Repeat"] as const;
// where each step starts on the scene's scroll progress (0..1)
const AT = [0, 0.16, 0.34, 0.5, 0.64, 0.8];

export function HeroStory({ ctaRef, start, tryHref }: { ctaRef: React.RefObject<HTMLDivElement | null>; start: string; tryHref: string }) {
  const calm = useCalmMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: t } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [live, setLive] = useState(0);
  useMotionValueEvent(t, "change", (v) => {
    let s = 0;
    for (let i = 0; i < AT.length; i++) if (v >= AT[i]) s = i;
    setLive(s);
  });
  const step = calm ? 4 : live;

  // the circles: apart -> the pod (by the plan) -> closer at the lock
  const p = useTransform(t, [0, 0.3, 0.62, 0.7], [0, 1, 1, 1.14]);
  const pCalm = useTransform(t, () => 1.14);
  // the card rises in as the pod forms
  const cardO = useTransform(t, [0.24, 0.34], [0, 1]);
  const cardY = useTransform(t, [0.24, 0.36], [48, 0]);
  // the hint fades as soon as you scroll
  const hintO = useTransform(t, [0, 0.06], [1, 0]);

  const n = step >= 3 ? 4 : 3;
  const locked = step >= 4;
  const again = step >= 5;
  const railAt = RAIL.indexOf(STEPS[step].k);

  return (
    <section ref={ref} className="hs" data-calm={calm ? "" : undefined} aria-labelledby="hs-h">
      <div className="hs-stage">
        <div className="hs-copy">
          <h1 id="hs-h" className="hs-h1">
            Find your people. <span>Then keep them.</span>
          </h1>
          <div className="hs-step" aria-live="polite">
            <ol className="hs-rail" aria-label="How it works">
              {RAIL.map((r, i) => (
                <li key={r} data-on={i <= railAt ? "" : undefined} data-now={i === railAt ? "" : undefined}>
                  {r}
                </li>
              ))}
            </ol>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={step}
                className="hs-line"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                {STEPS[step].line}
              </motion.p>
            </AnimatePresence>
          </div>
          <div ref={ctaRef} className="hs-cta">
            <Button asChild size="xl">
              <Link href={start}>Get started</Link>
            </Button>
            <a href={tryHref} className="lp-link">
              Try it first
            </a>
          </div>
        </div>

        <div className="hs-obj">
          <Orbs p={calm ? pCalm : p} settle={locked ? 1 : 0} pointerTarget={ref} className="hs-orbs" />
          <motion.div key={calm ? "calm" : "live"} className="hs-card-wrap" style={calm ? undefined : { opacity: cardO, y: cardY }}>
            <AnimatePresence mode="wait" initial={false}>
              {!again ? (
                <motion.div key="plan" className="hs-card" data-locked={locked ? "" : undefined} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
                  <p className="hs-over">
                    <span className="hs-pod">Hoopers</span>
                    <span className="hs-ai">Planned by AI</span>
                  </p>
                  <p className="hs-title">Saturday pickup</p>
                  <p className="hs-where tabular">
                    {PLAN_FACTS.place} · {TIME} · Free
                  </p>
                  <div className="hs-foot">
                    <InCount n={n} of={8} locked={locked} className="hs-count" />
                    {!locked && (
                      <span className="hs-btn" data-on={n === 4 ? "" : undefined} aria-hidden>
                        {n === 4 ? "You're in" : "I'm in"}
                      </span>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div key="vote" className="hs-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                  <p className="hs-over">
                    <span className="hs-pod">Hoopers</span>
                  </p>
                  <p className="hs-title">Run it back?</p>
                  <p className="hs-where">Same court, same people.</p>
                  <div className="hs-foot">
                    <span className="hs-count tabular">3 of 4 said yes</span>
                    <span className="hs-done">#2 is on</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
        {!calm && (
          <motion.p className="hs-hint" style={{ opacity: hintO }} aria-hidden>
            Scroll
          </motion.p>
        )}
      </div>
    </section>
  );
}
