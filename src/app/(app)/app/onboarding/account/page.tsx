// /app/onboarding/account: B05/B06 Keep your seat (number, code); ?mode=signin is Y04/Y05 Welcome back
import { Suspense } from "react";
import { SeatScreen } from "@/components/onboarding/screens/seat-screen";

export default function Page() {
  return (
    <Suspense>
      <SeatScreen />
    </Suspense>
  );
}
