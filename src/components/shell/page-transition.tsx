// Page transitions v3 (DESIGN.md §7): depth is distance (PB 3.2 warp zoom; SF 03, 06).
//   in    the next page grows out of the one you tapped (scale .94 → 1, fade)
//   out   the page you leave recedes (scale 1.04 → 1, fade)
//   side  pod to pod, step to step: a 24px slide + fade
// Enter-only CSS with `backwards` fill so no transform lingers (a lingering transform breaks position:fixed sheets).
// Reduced motion: a 160ms cross-fade. The first paint never animates.
"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { directionBetween, transitionKey } from "./nav";

type Dir = ReturnType<typeof directionBetween>;

export function PageTransition({
  pathname,
  children,
  keyFor = transitionKey,
  className,
}: {
  pathname: string;
  children: ReactNode;
  keyFor?: (pathname: string) => string;
  className?: string;
}) {
  const key = keyFor(pathname);
  const [nav, setNav] = useState<{ path: string; key: string; dir: Dir }>({ path: pathname, key, dir: "none" });

  if (nav.path !== pathname) {
    setNav({ path: pathname, key, dir: nav.key === key ? nav.dir : directionBetween(nav.path, pathname) });
  }

  return (
    <div key={key} className={cn("pods-page", className)} data-dir={nav.key === key ? nav.dir : "none"}>
      {children}
    </div>
  );
}

/** For a section's content slot inside its own layout: animates between that section's pages. */
export function RouteTransition({ children, className }: { children: ReactNode; className?: string }) {
  const pathname = usePathname() ?? "";
  return (
    <PageTransition pathname={pathname} className={className}>
      {children}
    </PageTransition>
  );
}
