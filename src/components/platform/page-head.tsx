// The compact list-page frame for Discover, Search and People (redesign r2, founder: "wasted space"). One header
// pattern: a 28/32px title with one quiet line under it, actions on the right, content right below. The phone keeps
// the chrome row (the mark); the laptop drops it because the sidebar already carries the logo.
"use client";

import type { ReactNode } from "react";
import { Stage } from "@/components/brand";
import { Chrome } from "@/components/shell";
import { cn } from "@/lib/cn";
import { useHydrated } from "@/lib/db/hooks";
import { Skeleton } from "@/components/ui/skeleton";

export function ListPage({ title, sub, actions, children, className }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  const hydrated = useHydrated();
  return (
    <>
      <Stage light="paper" />
      <div className="min-h-[100dvh] pb-[calc(var(--s12)+var(--shell-bottom,0px)+env(safe-area-inset-bottom))]">
        <Chrome left="mark" className="lg:hidden" />
        <div className={cn("mx-auto w-full max-w-[1280px] px-gutter pt-s4 lg:px-s12 lg:pt-s12", className)}>
          <header className="flex items-end justify-between gap-s4">
            <div className="min-w-0">
              <h1 className="text-[28px] leading-[1.15] font-semibold tracking-[-0.02em] text-ink lg:text-[32px]">{title}</h1>
              {sub && <p className="mt-1 min-h-[21px] text-[15px] leading-[1.4] text-ink-2">{hydrated ? sub : "\u00a0"}</p>}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-s2">{actions}</div>}
          </header>
          <div className="mt-s6">{hydrated ? children : <ListSkeleton />}</div>
        </div>
      </div>
    </>
  );
}

/** Loading: the list's own shape (rows of disc + two lines), not a spinner. */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-s4">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-s3">
          <Skeleton className="size-11 shrink-0 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-2/5 rounded-full" />
            <Skeleton className="mt-2 h-3 w-3/5 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A section label with an optional count and a right-side link. */
export function SectionLabel({ children, count, right, className }: { children: ReactNode; count?: number; right?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-s3", className)}>
      <h2 className="text-[15px] font-semibold text-ink">
        {children}
        {count != null && <span className="tabular font-normal text-ink-3">{` · ${count}`}</span>}
      </h2>
      {right}
    </div>
  );
}

/** Date block (Apple Music "This Week", Luma): the day is the visual for a plan, not an avatar. */
export function DateBlock({ iso, size = 44, tz = "America/Los_Angeles" }: { iso: string; size?: number; tz?: string }) {
  const d = new Date(iso);
  const mon = d.toLocaleString("en-US", { month: "short", timeZone: tz }).toUpperCase();
  const day = d.toLocaleString("en-US", { day: "numeric", timeZone: tz });
  return (
    <span
      aria-hidden
      className="grid shrink-0 grid-rows-[auto_1fr] overflow-hidden rounded-[12px] bg-surface text-center shadow-[inset_0_0_0_1px_var(--line)]"
      style={{ width: size, height: size + 4 }}
    >
      <span className="bg-[color-mix(in_srgb,var(--color-ember)_14%,transparent)] py-[2px] text-[10px] leading-[1.2] font-semibold tracking-[0.06em] text-ink-2">{mon}</span>
      <span className="tabular grid place-items-center text-[18px] leading-none font-semibold text-ink">{day}</span>
    </span>
  );
}
