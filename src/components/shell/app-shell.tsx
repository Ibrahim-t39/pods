// AppShell v3 (DESIGN.md §5; V3_SPEC.md §2). The chrome for every /app route is almost nothing: no tab bar, no rail,
// no demo strip. It holds the stage (pages set its light with <Stage>), the Offline word, the depth transitions and
// the StoreGate (routes outside first run need a signed-in person). Each page renders its own <Chrome> row.
"use client";

import "./shell.css";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { chromeFor, shellTransitionKey } from "./nav";
import { OfflineBanner } from "./offline-banner";
import { PageTransition } from "./page-transition";
import { StoreGate } from "./store-gate";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/app";
  const chrome = chromeFor(pathname);

  return (
    <div className="pods-shell" data-chrome={chrome}>
      <a
        href="#main"
        className="sr-only z-tooltip rounded-full bg-lit text-label text-ink shadow-md focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:px-4 focus:py-3"
      >
        Skip to content
      </a>
      <OfflineBanner />
      <main id="main" tabIndex={-1} className="pods-shell-main">
        <PageTransition pathname={pathname} keyFor={shellTransitionKey}>
          {chrome === "app" ? <StoreGate requireMe>{children}</StoreGate> : children}
        </PageTransition>
      </main>
    </div>
  );
}

/** Server / prerender fallback while the pathname resolves (dynamic routes under cacheComponents): the empty stage. */
export function AppShellFallback() {
  return <div className="pods-shell" data-chrome="bare" />;
}
