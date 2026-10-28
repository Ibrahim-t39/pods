// Admin states (DESIGN §6 PB 6.6: the empty state is a seat). Loading is the logo breathing (CirclesLoader) over rows of
// shimmering discs (CirclesSkeleton, MOTION_SYSTEM admin row);
// empty is one dashed seat and one short line. No illustrations, no explainer copy.
"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { CirclesLoader, CirclesSkeleton } from "@/components/brand/circles-loader";
import { ARRIVE } from "@/components/brand/motion";

export function AdminLoading() {
  return (
    <div aria-busy="true" className="lg:grid lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:gap-s24">
      <div className="flex items-center gap-s4">
        <CirclesLoader size={48} label="Loading" />
        <span aria-hidden className="skeleton h-10 w-40 lg:h-14" />
      </div>
      <ul aria-hidden className="mt-s8 rounded-[28px] bg-lit px-s4 py-s2 shadow-sm ring-1 ring-line lg:mt-0 lg:px-s6 lg:py-s3">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex h-[72px] items-center border-b border-line last:border-0">
            <CirclesSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Quiet({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={ARRIVE}
      className="flex items-center gap-s4 py-s6"
    >
      <span aria-hidden className="size-10 shrink-0 rounded-full border-[1.5px] border-dashed border-line-2 bg-primary-soft" />
      <p className="text-[22px] leading-none font-semibold tracking-[-0.02em] text-ink-2 lg:text-[26px]">{children}</p>
    </motion.div>
  );
}
