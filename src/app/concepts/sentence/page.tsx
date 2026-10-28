import { Suspense } from "react";
import { Begin } from "@/concepts/sentence/begin";

export default function Page() {
  return (
    <Suspense>
      <Begin />
    </Suspense>
  );
}
