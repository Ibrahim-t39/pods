// First-run layout: the draft shell around every step (each step draws its own FlowStep).
import { Suspense, type ReactNode } from "react";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <OnboardingShell>{children}</OnboardingShell>
    </Suspense>
  );
}
