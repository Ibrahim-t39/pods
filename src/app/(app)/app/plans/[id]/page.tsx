// One plan or hangout (planner_loop area). PLATFORM_SPEC §F4.
import { Suspense } from "react";
import { PlanDetailScreen } from "@/components/platform/plan-detail-screen";

export default function Page() {
  return (
    <Suspense>
      <PlanDetailScreen />
    </Suspense>
  );
}
