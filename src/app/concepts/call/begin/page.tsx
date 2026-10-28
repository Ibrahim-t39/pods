import { Suspense } from "react";
import { Begin } from "@/concepts/call/begin";

export default function Page() {
  return (
    <Suspense>
      <Begin />
    </Suspense>
  );
}
