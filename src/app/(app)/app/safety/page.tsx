// If something's off (profile_safety area). PLATFORM_SPEC §F9, V3_SPEC §6.5.
import { Suspense } from "react";
import { ScreenSkeleton } from "@/components/profile/screen-bits";
import { SafetyPage } from "@/components/safety/safety-page";

export default function Page() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <SafetyPage />
    </Suspense>
  );
}
