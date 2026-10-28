import { Suspense } from "react";
import { ScreenSkeleton } from "@/components/profile/screen-bits";
import { InboxScreen } from "./screen";

export default function Page() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <InboxScreen />
    </Suspense>
  );
}
