// /app/invite: bring a friend and save them a seat in one of your pods (PLATFORM_SPEC §F7).
import { Suspense } from "react";
import { ScreenSkeleton } from "@/components/profile/screen-bits";
import { InviteScreen } from "@/components/profile/invite-screen";

export default function Page() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <InviteScreen />
    </Suspense>
  );
}
