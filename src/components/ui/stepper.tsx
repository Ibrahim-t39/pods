// [U1] Stepper: onboarding progress, N segments × 4px, rounded; the current segment fills with a spring.
"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";

export function Stepper({ total, current, className, label }: { total: number; current: number; className?: string; label?: string }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-label={label ?? `Step ${current} of ${total}`}
      className={cn("flex w-full gap-1.5", className)}
    >
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="relative h-1 flex-1 overflow-hidden rounded-pill bg-border">
          <motion.span
            className="absolute inset-0 origin-left rounded-pill bg-primary"
            initial={false}
            animate={{ scaleX: i < current ? 1 : 0 }}
            transition={{ type: "spring", stiffness: 170, damping: 26 }}
          />
        </span>
      ))}
    </div>
  );
}
