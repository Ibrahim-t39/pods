// Hangouts live under Plans now (PLATFORM_SPEC §B): /app/events hands off to /app/plans.
import { Suspense } from "react";
import { ToList } from "./to-list";

export default function Page() {
  return (
    <Suspense>
      <ToList />
    </Suspense>
  );
}
