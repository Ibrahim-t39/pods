// Step guard: waits for the store and the draft, sends people to the right step, and shows the under-18 stop.
// `need` is what the step requires: "none" (You, Likes, Free, Keep your seat), "me" (Promise), "promise" (Check),
// "verified" (Finding).
"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useHydrated, useMe } from "@/lib/db/hooks";
import { PageSkeleton } from "@/components/shell/store-gate";
import type { User } from "@/lib/types";
import { useDraft, useDraftHydrated } from "./draft";
import { resumeRoute } from "./steps";
import { Under18 } from "./screens/stops";

export type Need = "none" | "me" | "promise" | "verified";

function allowed(need: Need, me: User | null): boolean {
  if (need === "none") return !me || me.onboarding_step !== "done";
  if (!me || me.onboarding_step === "done") return false;
  if (need === "me") return true;
  if (need === "promise") return !!me.pledge_accepted_at;
  return me.verified;
}

export function Guarded({ need, children }: { need: Need; children: (me: User | null) => ReactNode }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const draftReady = useDraftHydrated();
  const me = useMe();
  const blocked = useDraft((s) => s.minorBlocked);
  const ready = hydrated && draftReady;
  const ok = ready && allowed(need, me);
  useEffect(() => {
    if (ready && !blocked && !allowed(need, me)) router.replace(resumeRoute(me));
  }, [ready, blocked, need, me, router]);
  if (ready && blocked && !me) return <Under18 />;
  if (!ok) return <PageSkeleton />;
  return <>{children(me)}</>;
}
