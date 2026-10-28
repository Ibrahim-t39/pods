// /app/placing: B08 Finding your pods, B09 filling, B10 failed, then Your pods
import { Suspense } from "react";
import { PlacingScreen } from "@/components/onboarding/screens/placing-screen";

export default function Page() {
  return (
    <Suspense>
      <PlacingScreen />
    </Suspense>
  );
}
