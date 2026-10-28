// /app/settings (profile_safety area; QA round 1): the real Settings page. PLATFORM_SPEC §F10.
import { Suspense } from "react";
import { ScreenSkeleton } from "@/components/profile/screen-bits";
import { SettingsScreen } from "@/components/profile/settings-screen";

export default function Page() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <SettingsScreen />
    </Suspense>
  );
}
