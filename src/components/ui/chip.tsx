// [U1] Chip (BLUEPRINT §3.1, M2): 44px pill, optional emoji / icon + label, check when selected.
// Selected = pod-soft fill + pod-text + pod border (Signal by default, the pod hue inside <PodHue>).
// Used standalone (role=checkbox) or inside ChipGroup (checkbox or radio). `badge` for e.g. "Waitlist".
"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  emoji?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  /** "checkbox" (default) or "radio" (ChipGroup single). */
  kind?: "checkbox" | "radio";
  size?: "md" | "sm";
  /** Dimmed (e.g. max reached) but still focusable so the limit can be explained. */
  dim?: boolean;
}

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { selected = false, onSelectedChange, emoji, icon, badge, kind = "checkbox", size = "md", dim, className, children, onClick, disabled, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type="button"
      role={kind}
      aria-checked={selected}
      disabled={disabled}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) onSelectedChange?.(!selected);
      }}
      animate={selected ? { scale: [1, 1.04, 1] } : { scale: 1 }}
      transition={{ duration: 0.24, ease: [0.34, 1.56, 0.64, 1] }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "relative inline-flex shrink-0 items-center gap-2 rounded-pill border font-medium outline-offset-2 select-none",
        "transition-[background-color,border-color,color,box-shadow,opacity] duration-fast ease-standard",
        size === "md" ? "h-11 px-5 text-[15px]" : "h-11 px-4 text-[14px]",
        selected
          ? "border-ink bg-ink text-lit"
          : "border-line-2 bg-transparent text-ink hover:border-ink",
        (dim || disabled) && !selected && "opacity-40",
        disabled && "cursor-not-allowed",
        className,
      )}
      {...(rest as object)}
    >
      {emoji && (
        <span aria-hidden className="text-[17px] leading-none">
          {emoji}
        </span>
      )}
      {icon && <span className="flex [&_svg]:size-[18px]">{icon}</span>}
      <span>{children}</span>
      {badge && <span className="text-[12px] font-medium text-ink-2">{badge}</span>}
      <AnimatePresence initial={false}>
        {selected && (
          <motion.span
            key="check"
            initial={{ scale: 0, width: 0, opacity: 0 }}
            animate={{ scale: 1, width: "auto", opacity: 1 }}
            exit={{ scale: 0, width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="-mr-1 flex overflow-hidden"
          >
            <Icon name="check" size={16} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
});
