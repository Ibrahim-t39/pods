import { Suspense } from "react";
import { Landing } from "@/concepts/canopy/Landing";

export default function Page() {
  return (
    <Suspense>
      <Landing />
    </Suspense>
  );
}
