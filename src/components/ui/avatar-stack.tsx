// [U1] AvatarStack: max 5 + "+n", -8px overlap, 2px surface ring. New people slide in with a bouncy spring;
// pass `layoutPrefix` and render the same `layoutId` (`${prefix}-${id}`) on the RSVP button avatar inside a
// <LayoutGroup> and the avatar flies from the button into the stack (M8). A text alternative is mandatory:
// pass `label`, or it is built as "4 of 8 are in: Malik, Ama, Tobi and you".
"use client";

import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { listNames } from "@/lib/utils";
import { Avatar, type AvatarSize } from "./avatar";

export interface StackPerson {
  id: string;
  name: string;
  src?: string | null;
  you?: boolean;
  verified?: boolean;
}

export interface AvatarStackProps {
  people: StackPerson[];
  max?: number;
  size?: AvatarSize;
  /** Total for the auto label ("4 of 8 are in"). */
  of?: number;
  label?: string;
  /** Show dashed open seats up to this many slots (forming pods). */
  openSeats?: number;
  layoutPrefix?: string;
  className?: string;
}

export function AvatarStack({ people, max = 5, size = 28, of, label, openSeats = 0, layoutPrefix, className }: AvatarStackProps) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  const names = people.map((p) => (p.you ? "you" : p.name));
  const auto = `${of != null ? `${people.length} of ${of} are in` : `${people.length} ${people.length === 1 ? "person" : "people"}`}${names.length ? `: ${listNames(names)}` : ""}`;
  const overlap = size >= 36 ? -8 : -6;

  return (
    <div role="img" aria-label={label ?? auto} className={cn("flex items-center", className)}>
      <AnimatePresence initial={false} mode="popLayout">
        {shown.map((p, i) => (
          <motion.span
            key={p.id}
            layout="position"
            layoutId={layoutPrefix ? `${layoutPrefix}-${p.id}` : undefined}
            initial={{ scale: 0.3, opacity: 0, x: -6 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            exit={{ scale: 0.3, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            style={{ marginLeft: i === 0 ? 0 : overlap, zIndex: shown.length - i }}
            className="relative inline-flex"
          >
            <Avatar decorative name={p.name} seed={p.id} src={p.src} size={size} you={p.you} ring className="shadow-[0_0_0_2px_var(--stack-ring,var(--lit))]!" />
          </motion.span>
        ))}
      </AnimatePresence>
      {extra > 0 && (
        <span
          aria-hidden
          className="relative inline-grid place-items-center rounded-full bg-sunken font-semibold text-fg-muted tabular shadow-[0_0_0_2px_var(--color-surface)]"
          style={{ width: size, height: size, marginLeft: overlap, fontSize: Math.max(10, size * 0.36) }}
        >
          +{extra}
        </span>
      )}
      {Array.from({ length: Math.max(0, openSeats) }, (_, i) => (
        <Avatar key={`open-${i}`} open decorative size={size} style={{ marginLeft: overlap }} />
      ))}
    </div>
  );
}
