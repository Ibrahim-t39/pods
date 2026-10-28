// /app/discover (core area). PLATFORM_SPEC §F.
import { Suspense } from "react";
import { Discover } from "@/components/pods/discover";

export default function Page() {
  return (
    <Suspense>
      <Discover />
    </Suspense>
  );
}
