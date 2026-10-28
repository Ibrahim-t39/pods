// /app/verify: Check it's you (one flow step, before placement)
import { Suspense } from "react";
import { VerifyScreen } from "@/components/onboarding/screens/verify-screen";

export default function Page() {
  return (
    <Suspense>
      <VerifyScreen />
    </Suspense>
  );
}
