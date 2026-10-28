// /app/onboarding/city: the one city picker (from "Not here?")
import { Suspense } from "react";
import { CityScreen } from "@/components/onboarding/screens/city-screen";

export default function Page() {
  return (
    <Suspense>
      <CityScreen />
    </Suspense>
  );
}
