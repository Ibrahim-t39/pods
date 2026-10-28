// /app/people (core area). PLATFORM_SPEC §F.
import { Suspense } from "react";
import { People } from "@/components/pods/people";

export default function Page() {
  return (
    <Suspense>
      <People />
    </Suspense>
  );
}
