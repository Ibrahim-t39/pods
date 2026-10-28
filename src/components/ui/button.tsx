// Button v3 (DESIGN.md §8; COLOR_LIFE §6). commit = blue pill, the period of "pods." (one per screen) · spark = ember pill for the warm commits
// (I'm in, Run it back) · go = text link · destructive = outlined ink pill · quiet = outlined line pill · glass = lamp
// pill on the moment stage. Every size is >= 44px tall.
// Finish (COLOR_LIFE §12.4): filled pills carry the sheen (top light + 1px lit edge) and a layered coloured shadow;
// the sheen flattens on press. States: focus ring, pressed scale .96 then a spring back, disabled (outlined, ink-3), loading (spinner), success (filled-centre ring).
"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

export const buttonVariants = cva(
  [
    "pressable relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-ui font-semibold tracking-[-0.01em]",
    "outline-offset-3 focus-visible:outline-2 focus-visible:outline-focus-ring",
    "disabled:cursor-not-allowed aria-disabled:cursor-not-allowed",
    "[&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        /** commit: the one filled blue pill per screen (the blue period: the plan, settled; 5.6:1 with white). */
        primary: [
          "sheen bg-primary text-on-primary shadow-primary hover:bg-primary-hover active:bg-primary-pressed",
          "disabled:bg-transparent disabled:text-ink-3 disabled:shadow-[inset_0_0_0_1.5px_var(--line)]",
        ],
        /** spark: the warm commit. Ember with ink text (5.8:1). Only "I'm in" and "Run it back" (COLOR_LIFE §6). */
        spark: [
          "sheen bg-spark text-on-spark shadow-spark hover:brightness-[1.05]",
          "disabled:bg-transparent disabled:text-ink-3 disabled:shadow-[inset_0_0_0_1.5px_var(--line)]",
        ],
        /** v1 name kept: the pod's own commit = spark */
        pod: [
          "sheen bg-spark text-on-spark shadow-spark hover:brightness-[1.05]",
          "disabled:bg-transparent disabled:text-ink-3 disabled:shadow-[inset_0_0_0_1.5px_var(--line)]",
        ],
        /** quiet: an outlined pill for the second choice (Maybe, Keep it) */
        secondary: "bg-transparent text-ink shadow-[inset_0_0_0_1.5px_var(--line-2)] hover:shadow-[inset_0_0_0_1.5px_var(--ink)] disabled:text-ink-3",
        ghost: "bg-transparent text-ink hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] disabled:text-ink-3",
        /** destructive: outlined in ink, 2px (Give it up, Leave, Block, Delete). Never red-filled. */
        danger: "bg-transparent text-ink shadow-[inset_0_0_0_2px_var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] disabled:opacity-50",
        "danger-quiet": "bg-transparent text-danger-text hover:bg-danger-soft disabled:opacity-50",
        /** on the moment stage (lock, round two): lamp pill, deep field text (13:1) */
        glass: "sheen bg-lamp text-night shadow-[inset_0_1px_0_rgb(255_255_255/.9),0_10px_30px_-12px_rgb(0_0_0/.5)] hover:brightness-[1.04] disabled:opacity-50",
        /** go: a text link (Open the plan →). min 44px tall. */
        link: "h-auto! min-h-11 px-0! font-semibold text-ink underline decoration-primary/40 decoration-[1.5px] underline-offset-[5px] hover:decoration-current disabled:opacity-50",
      },
      size: {
        xl: "h-14 px-7 text-[17px] [&_svg]:size-5 lg:h-16 lg:px-8 lg:text-[20px]",
        lg: "h-14 px-7 text-[17px] [&_svg]:size-5",
        md: "h-12 px-6 text-[16px] [&_svg]:size-5",
        sm: "h-11 px-5 text-[15px] [&_svg]:size-[18px]",
      },
      shape: {
        pill: "rounded-full",
        rounded: "rounded-full",
      },
      block: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: { variant: "primary", size: "lg", shape: "pill", block: false },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  /** Shows a check in place of the icon (e.g. after "I'm in"). */
  success?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, shape, block, asChild, loading, success, leadingIcon, trailingIcon, children, disabled, type, onClick, ...rest },
  ref,
) {
  const cls = cn(buttonVariants({ variant, size, shape, block }), loading && "cursor-progress", className);
  if (asChild) {
    return (
      <Slot.Root ref={ref} className={cls} onClick={onClick} {...rest}>
        {children}
      </Slot.Root>
    );
  }
  const lead = loading ? "spinner" : success ? "check" : leadingIcon ? "icon" : null;
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cls}
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      onClick={loading ? (e) => e.preventDefault() : onClick}
      {...rest}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {lead && (
          <motion.span
            key={lead}
            className="-ml-1 inline-flex"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 520, damping: 22 }}
          >
            {lead === "spinner" ? <Spinner /> : lead === "check" ? <Icon name="check" /> : leadingIcon}
          </motion.span>
        )}
      </AnimatePresence>
      {children}
      {trailingIcon && <span className="-mr-1 inline-flex">{trailingIcon}</span>}
    </button>
  );
});
