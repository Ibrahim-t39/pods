// planner_loop · D03 + S01: the table with "Why this plan" open (deep link from texts and the Room).
import { Suspense } from "react";
import { PlanRoute } from "@/components/planner/table/plan-route";

export default function Page() {
  return (
    <Suspense>
      <PlanRoute />
    </Suspense>
  );
}
