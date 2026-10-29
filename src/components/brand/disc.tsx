// People are flat discs (DESIGN.md §6; PB 6.4; IL 41, 24, 71; COLOR_LIFE §4). Never photos in a ring, never stock faces.
// Colour (founder 2026-10-28, "Overlap", COLOR_LIFE §5.3):
// - Every person has their own logo colour, stable everywhere: signal blue, ember or grove green, picked from their
//   name. A table of people reads as the logo's circles; the people ARE the circles.
// - You are always ink (white initial), so you find yourself at once among the colours.
// - An open seat is a dashed ring (PB 6.6: the empty state is a seat).
// - Pod families (the table, the room circle) are separate: see POD_SOLID / POD_WASH.
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A pod's slot key. The key names the slot; the colour family it renders is POD_SOLID / POD_WASH. Each pod leads with
 *  one logo circle so your pods read as the logo: "ember" (first interest pod) = blue-led tide, "signal" (second
 *  interest) = ember-led glow, "grove" (community) = green-led grove. */
export type PodHueKey = "ember" | "signal" | "grove";
/** The pod's solid colour: rings that are not a person's, room circles, worn rings. */
export const POD_SOLID: Record<PodHueKey, string> = {
  ember: "var(--color-signal)",
  signal: "var(--color-ember)",
  grove: "var(--color-grove)",
};
/** v1 name: same as POD_SOLID. */
export const HUE_VAR = POD_SOLID;
/** Text on a pod solid. */
export const ON_HUE: Record<PodHueKey, string> = {
  ember: "#FFFFFF",
  signal: "var(--ink)",
  grove: "var(--ink)",
};
/** The pod's soft two-circle wash: table tops, hero objects, room circle fills. Deepens under data-depth (repeat). */
export const POD_WASH: Record<PodHueKey, string> = {
  ember: "var(--grad-tide-soft)",
  signal: "var(--grad-glow-soft)",
  grove: "var(--grad-grove-soft)",
};
/** The pod's full gradient (identity: the moment, round two, covers). */
export const POD_GRAD: Record<PodHueKey, string> = {
  ember: "var(--grad-tide)",
  signal: "var(--grad-glow)",
  grove: "var(--grad-grove)",
};

/** Person colours: the logo's three circles, so any table of people reads as the logo (QA r1: "blue, orange and green
 *  people"). AA with their text: blue 5.6:1 white, ember 5.8:1 ink, green 7.6:1 ink. */
export const PERSON_COLORS = [
  { bg: "var(--color-signal-text)", fg: "#FFFFFF" },
  { bg: "var(--color-ember)", fg: "var(--ink)" },
  { bg: "var(--color-grove)", fg: "var(--ink)" },
] as const;
/** You are ink (wireframes R3: "you are always black"): one dark bead among the logo colours, found at a glance. */
export const YOU_COLOR = { bg: "var(--you)", fg: "var(--on-you)" } as const;

/** Stable colour for a person from any seed (id, name or initial). */
export function personColor(seed: string | undefined, fallback = 0) {
  if (!seed) return PERSON_COLORS[fallback % PERSON_COLORS.length];
  let h = 7;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PERSON_COLORS[h % PERSON_COLORS.length];
}

export interface DiscProps {
  /** One letter. Initials inside discs are data, not copy (word counts skip them). */
  initial?: string;
  /** "you" = the ink bead; "open" = dashed empty seat; a pod key = a person in that pod (their own colour from
   *  `seed` / `label` / `initial`); "pod" = the pod's solid (use with `hue`). */
  tone?: PodHueKey | "you" | "open";
  /** stable colour seed for a person (user id or name). Defaults to label, then initial. */
  seed?: string;
  size?: number;
  /** ring around the disc in the stage colour, for overlapping stacks */
  ring?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function Disc({ initial, tone = "you", size = 40, ring, label, seed, className, style, children }: DiscProps) {
  const open = tone === "open";
  const person = tone === "you" ? YOU_COLOR : personColor(seed ?? label ?? initial);
  const bg = open ? "transparent" : person.bg;
  const fg = open ? "var(--ink-2)" : person.fg;
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-nc
      className={cn("relative grid flex-none place-items-center rounded-full font-serif leading-none select-none", className)}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        /* a bead (COLOR_LIFE §15): solid hue body (AA initial) with the bubble's window, rim and under-light; flat when open or tiny */
        backgroundImage: open || size < 20 ? undefined : "var(--bead)",
        color: fg,
        fontSize: Math.round(size * 0.5),
        border: open ? "1.5px dashed var(--line-2)" : undefined,
        boxShadow: open ? undefined : ring ? "0 0 0 2px var(--stage), var(--shadow-bead)" : size >= 20 ? "var(--shadow-bead)" : undefined,
        ...style,
      }}
    >
      {open ? null : initial}
      {children}
    </span>
  );
}

/** Overlapping discs (light overlap, letters stay whole). `max` caps the visible count and adds "+n" as a label disc. */
export function DiscStack({
  people,
  size = 32,
  max = 6,
  className,
}: {
  people: { initial: string; tone?: DiscProps["tone"]; label?: string; seed?: string }[];
  size?: number;
  max?: number;
  className?: string;
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  // founder review r3: a 30% overlap cut the initials in half. A light overlap (~22%, -6px at 28) with a 2px ring in the
  // card's colour keeps every letter whole; the first person sits on top.
  const ov = Math.max(4, Math.round(size * 0.22));
  return (
    <span className={cn("inline-flex items-center", className)} style={{ paddingLeft: ov }}>
      {shown.map((p, i) => (
        <Disc
          key={i}
          initial={p.initial}
          tone={p.tone}
          label={p.label}
          seed={p.seed}
          size={size}
          style={{ marginLeft: -ov, zIndex: shown.length - i, fontSize: Math.round(size * 0.42), fontFamily: "var(--font-ui, inherit)", fontWeight: 600, boxShadow: "0 0 0 2px var(--stack-ring, var(--lit))" }}
        />
      ))}
      {extra > 0 && (
        <span className="text-label text-ink-2" style={{ marginLeft: 8 }}>
          +{extra}
        </span>
      )}
    </span>
  );
}
