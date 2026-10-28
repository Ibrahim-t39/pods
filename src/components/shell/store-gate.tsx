// StoreGate: boots the persisted store and holds content until it has been read from this browser, so no
// screen ever renders seed data and then swaps (no layout shift on hydration). Server render and first client
// paint show `fallback` (a skeleton shaped like a page under the shell chrome).
// `requireMe`: in-app routes need a signed-in person; without one (fresh browser, after Reset demo or delete
// account) it sends them to /app, which routes to welcome or the right onboarding step.
"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useHydrated, useMe } from "@/lib/db/hooks";

export interface StoreGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireMe?: boolean;
}

export function StoreGate({ children, fallback, requireMe = false }: StoreGateProps) {
  const hydrated = useHydrated();
  const me = useMe();
  const router = useRouter();
  const missing = requireMe && (!me || me.status === "deleted");

  useEffect(() => {
    if (hydrated && missing) router.replace("/app");
  }, [hydrated, missing, router]);

  const ready = hydrated && !missing;
  // Children always render (in a hidden wrapper until ready), so the route segment is never "dropped" from the
  // server render (Next's instant-navigation validation) and nothing re-mounts when the store is ready.
  return (
    <>
      {!ready && (fallback ?? <PageSkeleton />)}
      <div hidden={!ready} className={ready ? "contents" : "hidden"}>
        {children}
      </div>
    </>
  );
}

/** Loading (C04, Z04): the empty stage and one dashed table breathing. No skeleton cards, no words (PB 6.6). */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="grid min-h-[100dvh] place-items-center">
      <span className="pods-breathe block size-40 rounded-full border-[1.5px] border-dashed border-line-2" />
    </div>
  );
}
