// /app/welcome: Y04/Y05 Welcome back (sign in by number)
import { Suspense } from "react";
import { SeatScreen } from "@/components/onboarding/screens/seat-screen";

export default function Page() {
  return (
    <Suspense>
      <SeatScreen signin />
    </Suspense>
  );
}
