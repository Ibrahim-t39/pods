// /app/onboarding/availability: B04 Free, 3 of 4
import { Suspense } from "react";
import { FreeScreen } from "@/components/onboarding/screens/free-screen";

export default function Page() {
  return (
    <Suspense>
      <FreeScreen />
    </Suspense>
  );
}
