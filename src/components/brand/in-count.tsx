// <InCount n={3} of={8} locked={false} />: the pod's "I'm in" counter (MOTION_SYSTEM §5.5, video beat 6).
// "3 of 8 in" ticks to "4 of 8 in" (digit rolls on the SNAPPY spring) and, when the plan locks, the word "Locked"
// arrives beside it with the pop (one 400 ms settle, no confetti). Screen readers hear one polite sentence.
// Reduced motion: the digit swaps and "Locked" fades in (NumberTicker / .pods-pop-in handle it).
"use client";

import { NumberTicker } from "@/components/ui/number-ticker";
import { cn } from "@/lib/cn";

export interface InCountProps {
  n: number;
  of: number;
  locked?: boolean;
  className?: string;
}

export function InCount({ n, of, locked, className }: InCountProps) {
  return (
    <span className={cn("inline-flex items-center gap-s2 tabular font-semibold leading-none", className)}>
      <span className="sr-only" aria-live="polite">
        {`${n} of ${of} in${locked ? ". Locked." : ""}`}
      </span>
      <span aria-hidden className="inline-flex items-center gap-[0.25em] leading-none">
        <NumberTicker value={n} />
        <span>of {of} in</span>
      </span>
      {locked && (
        <span aria-hidden key="locked" className="pods-pop-in rounded-full bg-select px-s3 py-s1 text-on-select">
          Locked
        </span>
      )}
    </span>
  );
}
