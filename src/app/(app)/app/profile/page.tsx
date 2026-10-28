import { Suspense } from "react";
import { ScreenSkeleton } from "@/components/profile/screen-bits";
import { ProfileScreen } from "./screen";

export default function Page() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <ProfileScreen />
    </Suspense>
  );
}
