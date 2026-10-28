// Home (core area): the adaptive front. PLATFORM_SPEC §F1, MOTION_SYSTEM §12 ("Now").
import { Suspense } from "react";
import { Home } from "@/components/pods/home";

export default function Page() {
  return (
    <Suspense>
      <Home />
    </Suspense>
  );
}
