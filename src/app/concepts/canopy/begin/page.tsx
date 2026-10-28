import { Suspense } from "react";
import { Begin } from "@/concepts/canopy/Begin";

export default function Page() {
  return (
    <Suspense>
      <Begin />
    </Suspense>
  );
}
