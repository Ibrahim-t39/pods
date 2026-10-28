// [U1] NumberTicker: each digit rolls to its new value (M8 "3 of 8" → "4 of 8", 220ms snappy). Screen readers
// get the plain number. Reduced motion: digits swap.
"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

export interface NumberTickerProps {
  value: number;
  className?: string;
  /** Minimum digits (pads with leading zeros only if > 1). */
  minDigits?: number;
  /** Announce changes ("4"); pair with surrounding text in an aria-live region for "4 of 8 are in". */
  live?: boolean;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export function NumberTicker({ value, className, minDigits = 1, live }: NumberTickerProps) {
  const reduce = useReducedMotion();
  const neg = value < 0;
  const str = Math.abs(Math.round(value)).toString().padStart(minDigits, "0");
  return (
    <span className={cn("relative inline-flex tabular leading-none", className)} aria-live={live ? "polite" : undefined}>
      <span className="sr-only">{value}</span>
      <span aria-hidden className="inline-flex overflow-hidden select-none" style={{ height: "1em", lineHeight: 1 }}>
        {neg && <span>−</span>}
        {str.split("").map((ch, idx) => {
          const d = Number(ch);
          const key = str.length - idx; // key from the right so units stay the units
          return (
            <span key={key} className="relative inline-block h-[1em] w-[1ch] overflow-hidden">
              <motion.span
                className="absolute inset-x-0 top-0 flex flex-col"
                initial={false}
                animate={{ y: `${-d}em` }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
              >
                {/* the rolling column is drawn by CSS (content: attr), so page text and screen readers get only the
                    one number above, never "3 0 1 2 3 4 5 6 7 8 9" (QA core r1) */}
                {DIGITS.map((n) => (
                  <span key={n} data-n={n} className="block h-[1em] text-center leading-none before:content-[attr(data-n)]" />
                ))}
              </motion.span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
