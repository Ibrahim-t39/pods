// The Doorway (/): the logo told as a scroll story (founder 2026-10-28: "well-thought, beautiful scroll-driven
// animation"; COLOR_LIFE §12.1). Not hero -> features -> how-it-works -> FAQ: ONE object that stays put while you scroll,
// and four scenes of a few words each arrive in sync with it.
//   0  paper  "Saved you a seat."   three circles, three people, each with their own world, drifting
//   1  dawn   "People who fit."     they drift together and overlap (darker where more meet)
//   2  clear  "Saturday. 10am. It's on."  a blue ring closes and four seats fill: the lock (video Scene 5, beat 4)
//   3  dusk   "Find your people." / "Then keep them."     the overlaps deepen, the centre fills, a second worn ring: repeat
// Scroll is never hijacked: no snap, no wheel capture, normal scroll speed; the stage is sticky and the story is a
// plain 440vh section. Reduced motion: the circles rest as the logo, scenes cross-fade. One filled pill that never
// moves ("Take your seat"); "Sign in" and "Legal" are the only other taps. No counts, testimonials, city or mockups.
"use client";

import Link from "next/link";
import { motion, useTransform } from "motion/react";
import { Logo } from "@/components/brand/logo";
import { Line } from "@/components/brand/line";
import { Stage, type StageLight } from "@/components/brand/stage";
import { VennStory } from "@/components/brand/venn-story";
import { useCalmMotion } from "@/components/brand/motion";
import { StoryBeat, useStory, type StoryWindow } from "@/components/brand/story";
import { Button } from "@/components/ui/button";
import "./doorway.css";

const LIGHT: StageLight[] = ["paper", "dawn", "clear", "dusk"];
// each scene's window on the 0..1 scroll: fade in, hold, fade out (the last one holds to the end)
// one line hands over to the next: the old rises out quickly (0.035), the new rises in right where it ended (0.045).
// Never two lines on top of each other (R2 tried an overlap: superimposed type, rejected), and the blank beat between
// them is a single scroll position, not a stretch.
const WINDOWS: StoryWindow[] = [
  [0, 0.001, 0.2, 0.235],
  [0.235, 0.28, 0.46, 0.495],
  [0.495, 0.54, 0.72, 0.755],
  [0.755, 0.8, 0.999, 1],
];

export function Doorway() {
  const reduced = useCalmMotion();
  const { ref, progress: scrollYProgress, scene } = useStory(WINDOWS);
  const cue = useTransform(scrollYProgress, [0, 0.06], [1, 0]);

  return (
    <div ref={ref} className="pods-door" data-scene={scene}>
      <Stage light={LIGHT[scene]} />

      <div className="door-stage">
        <header className="door-chrome">
          <Link href="/" aria-label="Pods" data-mark className="inline-flex h-11 items-center">
            <Logo variant="horizontal" title="" className="h-7 w-auto" />
          </Link>
          <Link href="/app/welcome" className="u pressable inline-flex min-h-11 items-center text-[15px] font-medium text-ink">
            Sign in
          </Link>
        </header>

        <main id="main" className="door-main">
          <div className="door-obj">
            <VennStory progress={scrollYProgress} reduced={reduced} className="door-venn" />
          </div>

          <div className="door-lines">
            <StoryBeat className="door-beat" p={scrollYProgress} w={WINDOWS[0]} live={scene === 0}>
              <Line size="xl" className="max-w-[9ch]">
                Saved you a seat.
              </Line>
              <p className="door-sub text-ink">Small friend groups that meet again.</p>
            </StoryBeat>
            <StoryBeat className="door-beat" p={scrollYProgress} w={WINDOWS[1]} live={scene === 1}>
              <Line as="h2" size="xl" className="max-w-[8ch]">
                People who fit.
              </Line>
              <p className="door-sub text-ink-2">Placed by your likes and free time.</p>
            </StoryBeat>
            <StoryBeat className="door-beat" p={scrollYProgress} w={WINDOWS[2]} live={scene === 2}>
              <Line as="h2" size="xl">
                Saturday. <span className="tabular-nums">10am.</span>
                <br />
                It&apos;s on.
              </Line>
              <p className="door-sub text-ink-2">
                <b className="font-semibold text-ink">Claude</b> plans it. Four say I&apos;m in.
              </p>
            </StoryBeat>
            <StoryBeat className="door-beat" p={scrollYProgress} w={WINDOWS[3]} live={scene === 3}>
              <p className="door-over text-ink-2">Find your people.</p>
              <Line as="h2" size="xl" className="max-w-[8ch]">
                Then keep <span className="door-them">them.</span>
              </Line>
              <p className="door-sub text-ink-2">After each hangout: run it back?</p>
            </StoryBeat>
          </div>
        </main>

        <div className="door-foot">
          <div className="door-aside">
            <span className="door-dots" aria-hidden>
              {[0, 1, 2, 3].map((b) => (
                <i key={b} data-on={scene === b ? "" : undefined} data-past={scene > b ? "" : undefined} />
              ))}
            </span>
            <Link
              href="/terms"
              className="door-legal u inline-flex min-h-11 items-center text-[15px] font-medium text-ink"
              data-show={scene === 3 ? "" : undefined}
              tabIndex={scene === 3 ? 0 : -1}
              aria-hidden={scene !== 3}
            >
              Legal
            </Link>
          </div>
          <Button asChild size="xl" className="door-pill">
            <Link href="/app">Take your seat</Link>
          </Button>
        </div>

        {/* a quiet cue on the first screen only: the story continues below */}
        <motion.span aria-hidden className="door-cue" style={{ opacity: cue }} />
      </div>
    </div>
  );
}
