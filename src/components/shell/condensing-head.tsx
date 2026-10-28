// <CondensingHead>: the page's bold line condenses into a compact glass header as you scroll (COLOR_LIFE §12.3).
// For content pages that scroll (Your seat, legal, Talk history, admin lists). Flow steps never scroll and keep <Page>.
//   at rest     the chrome row, then the large line, left-anchored at the gutter (TEMPLATE "page head")
//   scrolled    a 60px glass bar pins to the top: the glyphs stay where they were and the line shrinks into it
// Scroll-linked (motion useScroll on the window); transform and opacity only; nothing moves under reduced motion
// except the bar fading in. The large line keeps its h1 role; the compact copy is aria-hidden.
"use client";

import type { ReactNode } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Line, type LineSize } from "@/components/brand/line";
import { cn } from "@/lib/cn";
import { useCalmMotion } from "@/components/brand/motion";
import { Chrome, type ChromeProps } from "./chrome";

export interface CondensingHeadProps extends Pick<ChromeProps, "left" | "right" | "backHref" | "backLabel" | "onMenu" | "menuLabel"> {
  /** the page's bold line (one per screen) */
  title: ReactNode;
  /** the short text shown in the compact bar; defaults to the title when it is a string */
  compact?: string;
  /** a quiet label above the line ("Hoopers #1 · closes Thu") */
  overline?: ReactNode;
  size?: LineSize;
  className?: string;
}

export function CondensingHead({ title, compact, overline, size = "sm", className, ...chrome }: CondensingHeadProps) {
  const reduced = useCalmMotion();
  const { scrollY } = useScroll();
  const lineOpacity = useTransform(scrollY, [0, 72], [1, 0]);
  const lineScale = useTransform(scrollY, [0, 72], reduced ? [1, 1] : [1, 0.92]);
  const lineY = useTransform(scrollY, [0, 72], reduced ? [0, 0] : [0, -10]);
  const barOpacity = useTransform(scrollY, [40, 88], [0, 1]);
  const barTitleY = useTransform(scrollY, [48, 96], reduced ? [0, 0] : [8, 0]);
  const label = compact ?? (typeof title === "string" ? title : undefined);

  return (
    // `contents`: the wrapper adds no box, so the sticky chrome row sticks for the whole page (inside a wrapper box it
    // scrolled away with it; caught in the motion lab capture, MOTION_SYSTEM §9 R1).
    <div className="contents">
      {/* the compact bar: glass over whatever light the page has */}
      <motion.div
        aria-hidden
        className="glass pointer-events-none fixed inset-x-0 top-0 z-header h-[calc(env(safe-area-inset-top)+68px)] rounded-b-[20px] lg:h-[96px]"
        style={{ opacity: barOpacity }}
      />
      <div className="sticky top-0 z-header">
        <Chrome {...chrome} center={label ? <motion.span aria-hidden className="block max-w-[56vw] truncate text-[15px] font-semibold tracking-[-0.01em]" style={{ opacity: barOpacity, y: barTitleY }}>{label}</motion.span> : undefined} />
      </div>
      <motion.div className={cn("px-gutter pt-s6 lg:px-s16", className)} style={{ opacity: lineOpacity, scale: lineScale, y: lineY, transformOrigin: "0% 100%" }}>
        {overline != null && <p className="text-label text-ink-2">{overline}</p>}
        <Line size={size} className={cn(overline != null && "mt-s2")}>
          {title}
        </Line>
      </motion.div>
    </div>
  );
}
