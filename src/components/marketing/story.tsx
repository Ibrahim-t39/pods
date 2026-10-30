// <LandingStory />: the landing's scroll story (MOTION_SYSTEM §3), owned by marketing. Forked from the brand
// ProductStory (kept for /dev/story) so the landing can fix its QA round 1 findings without touching foundation:
//   - every scene is a finished composition once it is in view (reveals end by `cover 22%`, cards rise whole);
//   - each scene opens with one label (Fit, Plan, I'm in, Repeat) so the video's words sit on the page;
//   - the plan facts come from the seeded demo (config/demo.ts), so the story and the app never disagree;
//   - the closing mark and tagline moved to the landing's one closing section (no double ending).
// Scenes: People -> Fit -> Plan -> Lock (the one short pin) -> Repeat. Nothing here is a control.
"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useMotionValueEvent, useScroll } from "motion/react";
import { formatInTimeZone } from "date-fns-tz";
import { Bubble } from "@/components/brand/bubble";
import { PlanHalo } from "@/components/brand/plan-halo";
import { InCount } from "@/components/brand/in-count";
import { GENTLE, SNAPPY, STAGGER, useCalmMotion } from "@/components/brand/motion";
import { DEMO, demoDefaults } from "@/config/demo";
import { cn } from "@/lib/cn";
import "./story.css";

// The seeded Hoopers plan, in pod time (America/Los_Angeles), e.g. "Sunday, 1pm" and "Sun 1pm".
const AT = DEMO.hoopers.starts_at;
const WHEN = formatInTimeZone(AT, "America/Los_Angeles", "EEEE, haaa");
const WHEN_SHORT = formatInTimeZone(AT, "America/Los_Angeles", "EEE haaa");
const PARK = demoDefaults.venueVariant === "park_courts";
export const PLAN_FACTS = {
  when: WHEN,
  place: PARK ? "Miller Playfield" : "Miller Community Center",
  placeLine: PARK ? "Public park · Free" : "Public rec center",
  rain: PARK ? "Rec Center, indoors" : "Indoors already",
};

export function LandingStory({ className }: { className?: string }) {
  return (
    <div className={cn("ls", className)}>
      <People />
      <Fit />
      <Plan />
      <Lock />
      <Repeat />
    </div>
  );
}

function Copy({ kicker, line, sub }: { kicker?: string; line: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="ls-copy ls-in">
      {kicker && <p className="ls-kicker">{kicker}</p>}
      <h2 className="ls-line">{line}</h2>
      {sub && <p className="ls-sub">{sub}</p>}
    </div>
  );
}

/* 1. Three people, each alone; a world grows around each dot as it scrolls in. */
function People() {
  return (
    <section className="ls-scene ls-people" aria-label="Everyone starts new">
      <Copy line="Everyone starts new." sub="Three people, all new in town." />
      <div className="ls-obj ls-trio" aria-hidden>
        {(["ember", "signal", "grove"] as const).map((h, i) => (
          <span key={h} className="ls-grow" style={{ ["--i" as string]: i }}>
            <Bubble hue={h} size="var(--b)" dot="center" buoy={i * 1.7} solo />
          </span>
        ))}
      </div>
    </section>
  );
}

/* 2. Fit: the worlds drift into the logo's overlap, and the pods name themselves in the colours the app draws them
   (tokens.css pod hues: the first interest pod renders blue, the second orange, community pods green). */
const PODS = [
  { name: "Hoopers", hue: "signal" },
  { name: "Strings", hue: "ember" },
  { name: "Southern African", hue: "grove" },
  { name: "Adventist young adults", hue: "grove" },
] as const;

function Fit() {
  return (
    <section className="ls-scene ls-fit" aria-label="Pods finds who fits">
      <Copy kicker="Fit" line="Pods finds who fits." sub="By what you love and when you're free." />
      <div className="ls-obj ls-fitobj">
        <div className="ls-venn" aria-hidden>
          <span className="ls-drift" data-h="ember"><Bubble hue="ember" size="var(--v)" dot="top" /></span>
          <span className="ls-drift" data-h="signal"><Bubble hue="signal" size="var(--v)" dot="left" /></span>
          <span className="ls-drift" data-h="grove"><Bubble hue="grove" size="var(--v)" dot="right" /></span>
        </div>
        <ul className="ls-pods ls-in">
          {PODS.map((p) => (
            <li key={p.name} className="ls-pod" data-hue={p.hue}>
              <i aria-hidden />
              {p.name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* 3. Plan: the plan card, whole, under the halo. Looks like the app; it is not a control. */
function Plan() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.5 });
  return (
    <section className="ls-scene ls-plan" aria-label="AI plans the first hangout">
      <Copy kicker="Plan" line="AI plans the first hangout." sub="A time that works. A public place." />
      <div className="ls-obj ls-in" ref={ref}>
        <PlanHalo state={seen ? "waiting" : "off"} radius={28} className="ls-card-wrap">
          <div className="ls-card">
            <p className="ls-card-over">
              <span>Hoopers</span>
              <span className="ls-ai">Planned by AI</span>
            </p>
            <p className="ls-card-when tabular">{PLAN_FACTS.when}</p>
            <p className="ls-card-what">Pickup basketball</p>
            <p className="ls-card-where">{PLAN_FACTS.place} · Free</p>
            <div className="ls-card-foot">
              <span className="ls-seats" aria-hidden>
                {[0, 1, 2, 3].map((s) => (
                  <i key={s} data-on={s < 3 ? "" : undefined} />
                ))}
              </span>
              <InCount n={3} of={8} className="text-[15px]" />
            </div>
          </div>
        </PlanHalo>
      </div>
    </section>
  );
}

/* 4. The one pinned moment: the lock. Scroll picks the step; springs animate it. */
const SEATS = 8;
const SEATED: { hue: "signal" | "grove"; seat: number }[] = [
  { hue: "signal", seat: 0 },
  { hue: "grove", seat: 1 },
  { hue: "signal", seat: 2 },
];
const YOU_SEAT = 3;

function Lock() {
  const calm = useCalmMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [step, setStep] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (p) => setStep(p < 0.3 ? 0 : p < 0.66 ? 1 : 2));
  const s = calm ? 2 : step;
  const n = s >= 1 ? 4 : 3;
  const locked = s >= 2;

  return (
    <section ref={ref} className="ls-lock" data-calm={calm ? "" : undefined} aria-label="Four say I'm in. Locked.">
      <div className="ls-lock-stage">
        <div className="ls-copy ls-lock-copy">
          <p className="ls-kicker">I&apos;m in</p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.h2
              key={locked ? "on" : "in"}
              className="ls-line"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {locked ? "It's on." : "Four say I'm in."}
            </motion.h2>
          </AnimatePresence>
          <InCount n={n} of={SEATS} locked={locked} className="ls-lock-count" />
        </div>

        <div className="ls-table" aria-hidden data-locked={locked ? "" : undefined}>
          <svg className="ls-ring" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" className="ls-ring-base" />
            <motion.circle
              cx="50"
              cy="50"
              r="46"
              className="ls-ring-close"
              initial={false}
              animate={{ pathLength: locked ? 1 : n / SEATS }}
              transition={calm ? { duration: 0 } : GENTLE}
            />
          </svg>
          {Array.from({ length: SEATS }, (_, i) => {
            const who = SEATED.find((x) => x.seat === i);
            const you = i === YOU_SEAT;
            return (
              <span key={i} className="ls-seat" style={{ ["--a" as string]: `${(i / SEATS) * 360 - 90}deg` }}>
                {who ? (
                  <Bubble hue={who.hue} size="var(--s)" dot="center" settle={locked} solo />
                ) : you ? (
                  <AnimatePresence>
                    {n >= 4 && (
                      <motion.span
                        className="ls-you"
                        initial={calm ? false : { y: 90, scale: 0.6, opacity: 0 }}
                        animate={{ y: 0, scale: 1, opacity: 1 }}
                        transition={{ ...SNAPPY, delay: STAGGER }}
                      >
                        <Bubble hue="ember" size="var(--s)" dot="center" settle={locked} solo />
                      </motion.span>
                    )}
                  </AnimatePresence>
                ) : (
                  <i className="ls-empty" />
                )}
              </span>
            );
          })}
          <span className="ls-table-mid">
            <span className="tabular">{WHEN_SHORT}</span>
          </span>
        </div>
      </div>
    </section>
  );
}

/* 5. Repeat: the vote card, shown whole; the yes discs pop in once it is in view. */
function Repeat() {
  const voteRef = useRef<HTMLDivElement>(null);
  const voted = useInView(voteRef, { once: true, amount: 0.5 });
  const calm = useCalmMotion();
  const yes = voted || calm ? 4 : 0;
  return (
    <section className="ls-scene ls-repeat" aria-label="Run it back">
      <Copy kicker="Repeat" line="Then the pod meets again." sub="Same people. Two weeks later." />
      <div className="ls-obj ls-in" ref={voteRef}>
        <div className="ls-vote">
          <p className="ls-vote-q">Run it back?</p>
          <div className="ls-vote-row">
            <span className="ls-vote-discs" aria-hidden>
              {(["signal", "grove", "signal", "ember"] as const).map((h, i) => (
                <span key={i} className="ls-vote-slot">
                  <motion.span
                    initial={false}
                    animate={i < yes ? { scale: 1, opacity: 1 } : { scale: 0.4, opacity: 0 }}
                    transition={calm ? { duration: 0 } : { ...SNAPPY, delay: 0.2 + i * 0.16 }}
                  >
                    <Bubble hue={h} size={36} dot="center" solo />
                  </motion.span>
                </span>
              ))}
            </span>
            <span className="ls-vote-n tabular">{yes} of 4 yes</span>
          </div>
          <p className="ls-vote-next" data-on={yes === 4 ? "" : undefined}>Hangout #2 is on.</p>
        </div>
      </div>
    </section>
  );
}
