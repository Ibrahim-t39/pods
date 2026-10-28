// Plans (planner_loop area): upcoming and past across your pods. PLATFORM_SPEC §F4.
import { Suspense } from "react";
import { PlansScreen } from "@/components/platform/plans-screen";

export default function Page() {
  return (
    <Suspense>
      <PlansScreen />
    </Suspense>
  );
}
