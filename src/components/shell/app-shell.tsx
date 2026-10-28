// AppShell (DESIGN.md §5; MOTION_SYSTEM §12; PLATFORM_SPEC §C). The chrome for every /app route: the stage (pages set
// its light with <Stage>), the Offline word, the depth transitions, the StoreGate (routes outside first run need a
// signed-in person) and the navigation: the capsule on a phone, the rail on a laptop, ⌘K everywhere. First run and
// placement show no navigation (lib/platform/nav.ts `showsNav`).
"use client";

import "./shell.css";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { showsNav } from "@/lib/platform/nav";
import { useHydrated, useMe } from "@/lib/db/hooks";
import { chromeFor, shellTransitionKey } from "./nav";
import { CommandPalette, NavCapsule, NavRail, useNavKeys } from "./nav-bar";
import { OfflineBanner } from "./offline-banner";
import { PageTransition } from "./page-transition";
import { StoreGate } from "./store-gate";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/app";
  const chrome = chromeFor(pathname);
  const hydrated = useHydrated();
  const me = useMe();
  const nav = chrome === "app" && showsNav(pathname) && hydrated && !!me && me.status !== "deleted";
  const { palette, setPalette } = useNavKeys();

  return (
    <div className="pods-shell" data-chrome={chrome} data-nav={nav ? "" : undefined}>
      <a
        href="#main"
        className="sr-only z-tooltip rounded-full bg-lit text-label text-ink shadow-md focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:px-4 focus:py-3"
      >
        Skip to content
      </a>
      <OfflineBanner />
      {nav && <NavRail onSearch={() => setPalette(true)} />}
      <main id="main" tabIndex={-1} className="pods-shell-main">
        <PageTransition pathname={pathname} keyFor={shellTransitionKey}>
          {chrome === "app" ? <StoreGate requireMe>{children}</StoreGate> : children}
        </PageTransition>
      </main>
      {nav && <NavCapsule />}
      {nav && <CommandPalette open={palette} onClose={() => setPalette(false)} />}
    </div>
  );
}

/** Server / prerender fallback while the pathname resolves (dynamic routes under cacheComponents): the empty stage. */
export function AppShellFallback() {
  return <div className="pods-shell" data-chrome="bare" />;
}
