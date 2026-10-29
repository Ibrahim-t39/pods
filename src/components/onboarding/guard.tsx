// Step guard: waits for the store and the draft, sends people to the right step, and shows the under-18 stop.
// `need` is what the step requires: "none" (You, Likes, Free, Keep your seat), "me" (Promise), "promise" (Check),
// "verified" (Finding).
"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useHydrated, useMe } from "@/lib/db/hooks";
import { PageSkeleton } from "@/components/shell/store-gate";
import type { User } from "@/lib/types";
import { useDraft, useDraftHydrated } from "./draft";
import { STEP_ROUTE, openBefore, resumeRoute, type StepId } from "./steps";
import { Under18 } from "./screens/stops";

export type Need = "none" | "me" | "promise" | "verified";

function allowed(need: Need, me: User | null): boolean {
  if (need === "none") return !me || me.onboarding_step !== "done";
  if (!me || me.onboarding_step === "done") return false;
  if (need === "me") return true;
  if (need === "promise") return !!me.pledge_accepted_at;
  return me.verified;
}

/** The draft step a path belongs to, if any. */
function stepAt(path: string): StepId | null {
  const hit = (Object.entries(STEP_ROUTE) as [StepId, string][]).find(([, r]) => r === path);
  return hit ? hit[0] : null;
}

export function Guarded({ need, children }: { need: Need; children: (me: User | null) => ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const hydrated = useHydrated();
  const draftReady = useDraftHydrated();
  const me = useMe();
  const blocked = useDraft((s) => s.minorBlocked);
  const draft = useDraft();
  const ready = hydrated && draftReady;
  // Without an account, a later step never opens while an earlier one is unanswered (no skipping by URL).
  const step = stepAt(path);
  const earlier = !me && step ? openBefore(step, draft) : null;
  const ok = ready && allowed(need, me) && !earlier;
  useEffect(() => {
    if (!ready || blocked) return;
    if (!allowed(need, me)) router.replace(resumeRoute(me));
    else if (earlier) router.replace(STEP_ROUTE[earlier]);
  }, [ready, blocked, need, me, earlier, router]);
  if (ready && blocked && !me) return <Under18 />;
  if (!ok) return <PageSkeleton />;
  return <>{children(me)}</>;
}
