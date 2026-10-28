// First-run shell: hydrates the draft once and clears it on Start over. Each step draws its own <FlowStep>.
"use client";

import { useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useDraftHydrated, useResetWatcher } from "./draft";

export function OnboardingShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  useDraftHydrated();
  const onReset = useCallback(() => router.replace("/app/onboarding/about"), [router]);
  useResetWatcher(onReset);
  return <>{children}</>;
}
