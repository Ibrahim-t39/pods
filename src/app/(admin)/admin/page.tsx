import { Suspense } from "react";
import { Dashboard } from "@/components/admin/dashboard";

export default function Page() {
  return (
    <Suspense>
      <Dashboard />
    </Suspense>
  );
}
