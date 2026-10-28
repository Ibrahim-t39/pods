import { Suspense } from "react";
import { ScreenSkeleton } from "@/components/profile/screen-bits";
import { PersonScreen } from "./screen";

export default function Page() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <PersonScreen />
    </Suspense>
  );
}
