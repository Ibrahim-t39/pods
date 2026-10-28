// /app: sends a person to the right place once the store and the draft are read (Home once placed). A first visit goes straight into
// first run (B01): the Doorway's "Take your seat" is the welcome, so there is no second welcome screen.
// Keeps the query string (?director=1) across the hop.
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHydrated, useMe } from "@/lib/db/hooks";
import { useDraft, useDraftHydrated } from "@/components/onboarding/draft";
import { resumeRoute } from "@/components/onboarding/steps";
import { PageSkeleton } from "@/components/shell/store-gate";
import type { User } from "@/lib/types";

/** Where a person belongs right now. Pure over (me, draft). Signed-in people land on Home (PLATFORM_SPEC §O core 2). */
export function appRouteFor(me: User | null): string {
  const r = resumeRoute(me, useDraft.getState());
  return r === "/app/pods" ? "/app/home" : r;
}

export function AppRouterScreen() {
  const router = useRouter();
  const hydrated = useHydrated();
  const draftReady = useDraftHydrated();
  const me = useMe();
  useEffect(() => {
    if (!hydrated || !draftReady) return;
    router.replace(appRouteFor(me) + window.location.search);
  }, [hydrated, draftReady, me, router]);
  return <PageSkeleton />;
}
