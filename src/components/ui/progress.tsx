// [U1] Progress primitives.
//   CommitMeter  N segments + threshold notch + label (the plan card "3 of 8 in · locks at 4"). Segments fill
//                L→R (60ms stagger); at/after threshold they turn Grove (locked).
//   ProgressBar  thin animated bar (uploads, verification).
"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";

export interface CommitMeterProps {
  total: number;
  filled: number;
  threshold?: number;
  locked?: boolean;
  className?: string;
  /** Show "locks at 4" under the notch. */
  notchLabel?: boolean;
}

export function CommitMeter({ total, filled, threshold, locked, className, notchLabel }: CommitMeterProps) {
  const n = Math.max(1, total);
  return (
    <div className={cn("relative", className)}>
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={n}
        aria-valuenow={filled}
        aria-label={`${filled} of ${n} in${threshold ? `, locks at ${threshold}` : ""}`}
        className="relative flex gap-1"
      >
        {Array.from({ length: n }, (_, i) => {
          const on = i < filled;
          return (
            <span key={i} className="relative h-1.5 flex-1 overflow-hidden rounded-pill bg-sunken shadow-[inset_0_0_0_1px_var(--color-border)] dark:bg-border">
              <motion.span
                className={cn("absolute inset-0 origin-left rounded-pill", locked ? "bg-grove-gloss" : "bg-signal-gloss")}
                initial={false}
                animate={{ scaleX: on ? 1 : 0 }}
                transition={{ duration: 0.14, delay: on ? i * 0.06 : 0, ease: [0.2, 0, 0, 1] }}
              />
            </span>
          );
        })}
        {threshold != null && threshold > 0 && threshold < n && (
          <span
            aria-hidden
            className="absolute -top-1 h-3.5 w-0.5 -translate-x-1/2 rounded-pill bg-fg"
            style={{ left: `calc(${(threshold / n) * 100}% - ${2 - (threshold / n) * 4}px)` }}
          />
        )}
      </div>
      {notchLabel && threshold != null && (
        <span
          aria-hidden
          className="absolute top-3 -translate-x-1/2 text-[12px] font-medium whitespace-nowrap text-fg-subtle"
          style={{ left: `${(threshold / n) * 100}%` }}
        >
          locks at {threshold}
        </span>
      )}
    </div>
  );
}

export function ProgressBar({ value, max = 100, className, label, tone = "signal" }: { value: number; max?: number; className?: string; label?: string; tone?: "signal" | "grove" | "pod" }) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-pill bg-sunken shadow-[inset_0_0_0_1px_var(--color-border)]", className)}
    >
      <motion.div
        className={cn("h-full origin-left rounded-pill", tone === "grove" ? "bg-grove-gloss" : tone === "pod" ? "bg-pod-gloss" : "bg-signal-gloss")}
        initial={false}
        animate={{ scaleX: pct }}
        transition={{ type: "spring", stiffness: 170, damping: 26 }}
      />
    </div>
  );
}
