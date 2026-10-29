// <PageHeader>: the one compact page head used across the app (redesign: no giant serif titles pushing content down).
//   phone    the chrome row (the mark left, the page's tools right), then a 28px title + one quiet meta line
//   laptop   no chrome row (the rail carries the mark): title and meta left, tools right, on one line
// The title keeps the page's h1. Hero moments (the lock, round two) do not use this.
// The one set of numbers (sweep 10/29), shared with ListPage (Discover, People, Search) so every top-level h1 sits
// in the same place: a 1280 column, 48px inset and 48px top at laptop, 32px Archivo 600, the meta line 4px under it.
"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Chrome, type ChromeProps } from "./chrome";

export interface PageHeaderProps {
  title: ReactNode;
  /** one quiet line under the title: "4 pods · 2 need you", "Wednesday, Oct 28" */
  meta?: ReactNode;
  /** small tools on the right (icon buttons, a text action) */
  actions?: ReactNode;
  /** phone-only tools in the chrome row (search) */
  chromeRight?: ChromeProps["right"];
  left?: ChromeProps["left"];
  backHref?: string;
  className?: string;
}

export function PageHeader({ title, meta, actions, chromeRight, left = "mark", backHref, className }: PageHeaderProps) {
  return (
    <>
      <Chrome left={left} backHref={backHref} right={chromeRight ?? "none"} className="lg:hidden" />
      <header className={cn("pods-ph mx-auto flex w-full max-w-[1280px] items-end justify-between gap-s4 px-gutter pt-s4 lg:px-s12 lg:pt-s12", className)}>
        <div className="min-w-0">
          <h1 className="font-display text-[28px] leading-[1.1] font-semibold tracking-[-0.025em] text-ink lg:text-[32px]">{title}</h1>
          {meta != null && <p className="mt-1 text-[15px] leading-[1.4] text-ink-2">{meta}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-s2">{actions}</div>}
      </header>
    </>
  );
}
