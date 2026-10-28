import { Suspense } from "react";
import { HangoutsScreen } from "@/components/admin/hangouts-screen";

export default function Page() {
  return (
    <Suspense>
      <HangoutsScreen />
    </Suspense>
  );
}
