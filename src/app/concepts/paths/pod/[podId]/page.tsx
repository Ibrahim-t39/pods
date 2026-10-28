import { Suspense } from "react";
import { PodRoute } from "@/concepts/paths/PodRoute";

export default function Page() {
  return (
    <Suspense>
      <PodRoute />
    </Suspense>
  );
}
