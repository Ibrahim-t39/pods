import { Suspense } from "react";
import { PodPage } from "@/concepts/canopy/PodPage";

export default function Page() {
  return (
    <Suspense>
      <PodPage />
    </Suspense>
  );
}
