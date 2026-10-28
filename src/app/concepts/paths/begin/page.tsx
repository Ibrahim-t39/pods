import { Suspense } from "react";
import { Begin } from "@/concepts/paths/Begin";

export default function Page() {
  return (
    <Suspense>
      <Begin />
    </Suspense>
  );
}
