// /app/invite (core area). PLATFORM_SPEC §F.
import { Suspense } from "react";
import { Invite } from "@/components/pods/invite";

export default function Page() {
  return (
    <Suspense>
      <Invite />
    </Suspense>
  );
}
