import { Suspense } from "react";
import { Grounds } from "@/concepts/canopy/Grounds";

// No home list: this opens on the ground that needs you.
export default function Page() {
  return (
    <Suspense>
      <Grounds />
    </Suspense>
  );
}
