// /app/onboarding/pledge: B07 Promise, 4 of 4, with the AI consent
import { Suspense } from "react";
import { PromiseScreen } from "@/components/onboarding/screens/promise-screen";

export default function Page() {
  return (
    <Suspense>
      <PromiseScreen />
    </Suspense>
  );
}
