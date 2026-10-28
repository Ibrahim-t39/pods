// /app/onboarding/about: B01 You, 1 of 4 (V3_SPEC §6.2)
import { Suspense } from "react";
import { YouScreen } from "@/components/onboarding/screens/you-screen";

export default function Page() {
  return (
    <Suspense>
      <YouScreen />
    </Suspense>
  );
}
