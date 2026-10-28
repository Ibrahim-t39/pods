// /app/onboarding/interests: B02 Likes, 2 of 4, with the B03s Community pods sheet
import { Suspense } from "react";
import { LikesScreen } from "@/components/onboarding/screens/likes-screen";

export default function Page() {
  return (
    <Suspense>
      <LikesScreen />
    </Suspense>
  );
}
