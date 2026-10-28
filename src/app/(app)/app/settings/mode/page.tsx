// Settings › Mode (profile_safety area): Demo / Live. PLATFORM_SPEC §M.
import { Suspense } from "react";
import { ScreenSkeleton } from "@/components/profile/screen-bits";
import { ModeScreen } from "@/components/profile/mode-screen";

export default function Page() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <ModeScreen />
    </Suspense>
  );
}
