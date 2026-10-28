// Sticky scroll stories (MOTION_SYSTEM §3). One object stays put on a sticky stage while a few words per scene arrive
// in sync with normal scrolling. Never scroll-jacked: no snap, no wheel capture, the section is just tall.
//   const { ref, progress, scene } = useStory(WINDOWS)
//   <div ref={ref} style={{ height: "440vh" }}><div className="sticky top-0 h-dvh">…<StoryBeat p={progress} w={WINDOWS[0]} live={scene===0}>…</StoryBeat></div></div>
// Windows are [inStart, inEnd, outStart, outEnd] on the 0..1 progress. Neighbours must not overlap (two lines on top
// of each other read as noise; Doorway R2). Hidden beats are visibility:hidden so they are neither read nor counted.
// Reduced motion: beats cross-fade without travel.
"use client";

import { useRef, useState, type ReactNode } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "motion/react";
import { useCalmMotion } from "./motion";

export type StoryWindow = [number, number, number, number];

export function useStory(windows: StoryWindow[]) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [scene, setScene] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    let s = 0;
    windows.forEach((w, i) => {
      if (p >= w[0]) s = i;
    });
    setScene(s);
  });
  return { ref, progress: scrollYProgress, scene };
}

export function StoryBeat({ p, w, live, className, children }: { p: MotionValue<number>; w: StoryWindow; live: boolean; className?: string; children: ReactNode }) {
  const reduced = useCalmMotion();
  const first = w[0] === 0;
  const last = w[3] >= 1;
  const opacity = useTransform(p, w, first ? [1, 1, 1, 0] : last ? [0, 1, 1, 1] : [0, 1, 1, 0]);
  const y = useTransform(p, w, reduced ? [0, 0, 0, 0] : [first ? 0 : 28, 0, 0, last ? 0 : -20]);
  const visibility = useTransform(opacity, (o) => (o < 0.02 ? "hidden" : "visible"));
  return (
    <motion.section className={className} style={{ opacity, y, visibility }} aria-hidden={!live}>
      {children}
    </motion.section>
  );
}
