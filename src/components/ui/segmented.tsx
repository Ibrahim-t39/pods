// [U1] Segmented: pill track + sliding glossy capsule (shared layout, M5). 2-4 options. radiogroup semantics.
"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";

export interface SegmentedProps<T extends string> {
  options: { value: T; label: ReactNode; icon?: ReactNode; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  size?: "md" | "sm";
  block?: boolean;
  className?: string;
}

export function Segmented<T extends string>({ options, value, onChange, label, size = "md", block, className }: SegmentedProps<T>) {
  const layoutId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const n = (i + dir + options.length) % options.length;
    onChange(options[n].value);
    refs.current[n]?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "relative inline-flex rounded-pill bg-sunken p-1 shadow-[inset_0_0_0_1px_var(--color-border)]",
        block && "flex w-full",
        className,
      )}
    >
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative z-0 inline-flex flex-1 items-center justify-center gap-1.5 rounded-pill font-semibold whitespace-nowrap outline-offset-1",
              "transition-colors duration-fast ease-standard [&_svg]:size-4",
              size === "md" ? "h-10 px-4 text-[14.5px]" : "h-8 px-3 text-[13px]",
              on ? "text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            {on && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 -z-10 rounded-pill bg-surface shadow-[var(--shadow-sm),inset_0_0_0_1px_var(--color-border)] dark:bg-raised"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            {o.icon}
            {o.label}
            {o.count != null && (
              <span className={cn("tabular rounded-pill px-1.5 text-[12px]", on ? "bg-primary-soft text-primary-soft-text" : "bg-border text-fg-muted")}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
