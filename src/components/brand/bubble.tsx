// <Bubble hue="ember" size={120} dot="top" buoy>: a person's world as a clean glossy bubble (MOTION_SYSTEM §11).
// The white dot is the person (BRAND §1, mark.svg); the bubble is their world; overlapping bubbles multiply into
// luminous shared tints (the pod). Motion states: buoy (ambient float), grow (arrive), merge (commit), settle (lock).
// Colour only from tokens; CSS in ./bubble.css. Decorative by default (aria-hidden) unless it has a label.
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import "./bubble.css";

export type BubbleHue = "ember" | "signal" | "grove" | "teal";

/** Where the person sits inside their world, like the logo: dots are pushed 0.38r outward from the group centre. */
const DOT_AT = {
  top: [0, -19],
  left: [-17, 8],
  right: [17, 8],
  center: [0, 0],
  none: null,
} as const;

export interface BubbleProps {
  hue?: BubbleHue;
  size?: number | string;
  dot?: keyof typeof DOT_AT;
  /** ambient float, 3px; give each bubble its own delay so they are out of phase */
  buoy?: boolean | number;
  /** arrive: the world grows around the dot (seconds of delay) */
  grow?: boolean | number;
  /** commit: translate toward a shared centre */
  merge?: { x: string; y: string } | false;
  /** the lock: one soft squash */
  settle?: boolean;
  solo?: boolean;
  label?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Bubble({ hue = "signal", size = 120, dot = "top", buoy, grow, merge, settle, solo, label, className, style }: BubbleProps) {
  const at = DOT_AT[dot];
  const vars: Record<string, string> = { "--size": typeof size === "number" ? `${size}px` : size };
  if (typeof buoy === "number") vars["--buoy-delay"] = `${-buoy}s`;
  if (typeof grow === "number") vars["--grow-delay"] = `${grow}s`;
  if (merge) {
    vars["--mx"] = merge.x;
    vars["--my"] = merge.y;
  }
  return (
    <span
      aria-hidden={label ? undefined : true}
      className={cn("pods-bubble", className)}
      data-hue={hue}
      data-buoy={buoy !== undefined && buoy !== false && !merge ? "" : undefined}
      data-grow={grow !== undefined && grow !== false ? "" : undefined}
      data-merge={merge ? "" : undefined}
      data-settle={settle ? "" : undefined}
      data-solo={solo ? "" : undefined}
      style={{ ...vars, ...style } as CSSProperties}
    >
      {at && <i className="pods-bubble__dot" style={{ ["--dx" as string]: `${at[0]}%`, ["--dy" as string]: `${at[1]}%` }} />}
      {label && <span className="pods-bubble__label">{label}</span>}
    </span>
  );
}
