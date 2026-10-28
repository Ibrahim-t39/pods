import { Suspense } from "react";
import { PodsScreen } from "@/components/admin/pods-screen";

export default function Page() {
  return (
    <Suspense>
      <PodsScreen />
    </Suspense>
  );
}
