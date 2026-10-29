// <PodOrb>: the pod's compact mark for lists and headers. A solid disc in the pod's hue with one white dot per person
// (the dot is the person, BRAND §1); people who said yes to the plan are full white, the rest half-lit; you are the
// first dot, slightly larger. Flat and solid (no gloss): glossy bubbles stay a rare accent.
// A pod that is not open yet is an outline with dots in its hue.
import type { CSSProperties } from "react";
import { POD_SOLID, type PodHueKey } from "@/components/brand/disc";
import { cn } from "@/lib/cn";

export function PodOrb({
  hue,
  people,
  inCount = 0,
  size = 48,
  open = true,
  needs,
  you = true,
  className,
}: {
  hue: PodHueKey;
  /** everyone in the pod, you included */
  people: number;
  /** how many have said yes (lit first, you counted if you are in) */
  inCount?: number;
  size?: number;
  open?: boolean;
  /** a small ember spark: this pod waits on you */
  needs?: boolean;
  /** false when you are not in this pod (Discover, Search): no larger "you" dot, filled dots = people in */
  you?: boolean;
  className?: string;
}) {
  const n = Math.max(1, Math.min(10, people));
  const H = POD_SOLID[hue];
  const style: CSSProperties = open ? { width: size, height: size, background: H } : { width: size, height: size, background: `color-mix(in oklab, ${H} 10%, white)`, boxShadow: `inset 0 0 0 1.5px color-mix(in oklab, ${H} 45%, white)` };
  const r = size >= 64 ? 31 : 29;
  return (
    <span aria-hidden data-nc className={cn("relative block shrink-0 rounded-full", className)} style={style}>
      {Array.from({ length: n }, (_, d) => {
        const a = -Math.PI / 2 + (d / n) * Math.PI * 2;
        const me = you && d === 0;
        const lit = d < inCount;
        const dot = me ? 16 : 11;
        return (
          <span
            key={d}
            className="absolute rounded-full"
            style={{
              width: `${dot}%`,
              height: `${dot}%`,
              left: `${50 + Math.cos(a) * r}%`,
              top: `${50 + Math.sin(a) * r}%`,
              transform: "translate(-50%,-50%)",
              background: open ? (lit || me ? "#fff" : "rgb(255 255 255 / .45)") : `color-mix(in oklab, ${H} ${lit ? 80 : 40}%, white)`,
            }}
          />
        );
      })}
      {needs && <span className="absolute -top-0.5 -right-0.5 size-[26%] min-h-2.5 min-w-2.5 rounded-full bg-spark shadow-[0_0_0_2px_var(--paper)]" />}
    </span>
  );
}
