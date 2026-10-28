import { Suspense } from "react";
import { ReportsScreen } from "@/components/admin/reports-screen";

export default function Page() {
  return (
    <Suspense>
      <ReportsScreen />
    </Suspense>
  );
}
