// <PullCircles onRefresh={…} />: pull-to-refresh drawn as the logo (MOTION_SYSTEM §5). Pull down at the top of a
// scrolling page and three circles drift together as you pull (fit); past the threshold they overlap and a ring
// closes; release and they breathe (CirclesLoader) until onRefresh resolves, then lift away. Touch only, only when the
// page is at the very top, never blocks normal scrolling (passive listeners; the page itself does not move).
// Use on scrolling content pages (Talk history, admin lists, Your seat). Never on flow steps.
// Reduced motion: no travel, the circles fade in at rest and the loader stays still.
"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { CirclesLoader } from "./circles-loader";
import { useCalmMotion, SNAPPY, GENTLE } from "./motion";

const THRESHOLD = 72; // px of (damped) pull that commits
const MAX = 112;

export function PullCircles({ onRefresh, label = "Refreshing" }: { onRefresh: () => Promise<unknown> | void; label?: string }) {
  const reduced = useCalmMotion();
  const pull = useMotionValue(0);
  const [busy, setBusy] = useState(false);
  const start = useRef<number | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      if (busyRef.current || window.scrollY > 0 || e.touches.length !== 1) return;
      start.current = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (start.current == null) return;
      const dy = e.touches[0].clientY - start.current;
      if (dy <= 0 || window.scrollY > 0) {
        pull.set(0);
        return;
      }
      pull.set(Math.min(MAX, dy * 0.5)); // damped: it follows the finger at half speed
    };
    const onEnd = async () => {
      if (start.current == null) return;
      start.current = null;
      if (pull.get() >= THRESHOLD) {
        busyRef.current = true;
        setBusy(true);
        animate(pull, THRESHOLD, GENTLE);
        try {
          await onRefresh();
        } finally {
          busyRef.current = false;
          setBusy(false);
          animate(pull, 0, GENTLE);
        }
      } else {
        animate(pull, 0, SNAPPY);
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [onRefresh, pull]);

  const t = useTransform(pull, [0, THRESHOLD], [0, 1], { clamp: true });
  const y = useTransform(pull, (v) => (reduced ? 12 : v * 0.6));
  const opacity = useTransform(pull, [8, 40], [0, 1]);
  const spread = useTransform(t, (v) => (reduced ? 0 : (1 - v) * 14)); // px each circle sits away from the fit
  const ring = useTransform(pull, [THRESHOLD * 0.8, THRESHOLD], [0, 1]);

  return (
    <motion.div aria-hidden={!busy} className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+8px)] z-header flex justify-center" style={{ y, opacity }}>
      {busy ? (
        <CirclesLoader size={36} label={label} />
      ) : (
        <span className="relative block size-9">
          <motion.svg viewBox="0 0 36 36" className="absolute inset-0 overflow-visible">
            <motion.circle cx="18" cy="18" r="17" fill="none" stroke="var(--select)" strokeWidth="1.5" style={{ pathLength: ring, rotate: -90, transformOrigin: "18px 18px" }} />
          </motion.svg>
          <Dot hue="var(--pods-ember)" x={18} y={12} dx={0} dy={-1} spread={spread} />
          <Dot hue="var(--pods-signal)" x={13} y={21} dx={-0.87} dy={0.5} spread={spread} />
          <Dot hue="var(--pods-grove)" x={23} y={21} dx={0.87} dy={0.5} spread={spread} />
        </span>
      )}
    </motion.div>
  );
}

function Dot({ hue, x, y, dx, dy, spread }: { hue: string; x: number; y: number; dx: number; dy: number; spread: ReturnType<typeof useMotionValue<number>> }) {
  const tx = useTransform(spread, (s) => dx * s);
  const ty = useTransform(spread, (s) => dy * s);
  return (
    <motion.i
      className="absolute block size-[14px] rounded-full mix-blend-multiply"
      style={{ left: x - 7, top: y - 7, x: tx, y: ty, backgroundColor: hue, backgroundImage: "var(--disc-sheen)" }}
    />
  );
}
