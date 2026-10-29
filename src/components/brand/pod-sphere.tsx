// <PodSphere>: the one way a pod is drawn (founder 2026-10-29: "I would prefer the pods be 3D glossy").
// A solid glossy sphere in the pod's hue with one white bead per person (the logo's dot = a person). People who said yes
// are full white, the rest half-lit; you are the first bead, slightly larger. A pod that is not open yet is the same
// sphere in clear tinted glass with beads in its hue. People avatars, buttons and cards stay flat: gloss is for pods.
// CSS in ./pod-sphere.css; everything scales from the size, so it reads the same as a 24px list icon or a 200px hero.
import type { CSSProperties } from "react";
import { POD_SOLID, type PodHueKey } from "./disc";
import { cn } from "@/lib/cn";
import "./pod-sphere.css";

export interface PodSphereProps {
  hue: PodHueKey;
  /** everyone in the pod, you included (1-10 beads) */
  people: number;
  /** how many have said yes (lit first; you counted if you are in) */
  inCount?: number;
  size?: number;
  open?: boolean;
  /** a small ember spark: this pod waits on you */
  needs?: boolean;
  /** false when you are not in this pod (Discover, Search): no larger "you" bead, lit beads = people in */
  you?: boolean;
  /** hero only: a slow float (respects reduced motion) */
  float?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function PodSphere({ hue, people, inCount = 0, size = 48, open = true, needs, you = true, float, className, style }: PodSphereProps) {
  const n = Math.max(1, Math.min(10, people));
  // beads sit on a ring a little inside the edge; at hero sizes the ring opens up so the beads breathe
  const r = size >= 96 ? 30 : size >= 64 ? 31 : 29;
  const vars = { "--ps": `${size}px`, "--ps-h": POD_SOLID[hue] } as CSSProperties;
  return (
    <span
      aria-hidden
      data-nc
      data-open={open ? undefined : "false"}
      data-size={size < 30 ? "xs" : undefined}
      data-float={float ? "" : undefined}
      className={cn("pod-sphere", className)}
      style={{ ...vars, ...style }}
    >
      {Array.from({ length: n }, (_, d) => {
        const a = -Math.PI / 2 + (d / n) * Math.PI * 2;
        const me = you && d === 0;
        const lit = d < inCount;
        const dot = me ? 16 : 11;
        return (
          <span
            key={d}
            className="pod-sphere__dot"
            data-dim={open && !(lit || me) ? "" : undefined}
            data-lit={lit ? "" : undefined}
            style={{ width: `${dot}%`, height: `${dot}%`, left: `${50 + Math.cos(a) * r}%`, top: `${50 + Math.sin(a) * r}%` }}
          />
        );
      })}
      {needs && <span className="pod-sphere__spark" />}
    </span>
  );
}
