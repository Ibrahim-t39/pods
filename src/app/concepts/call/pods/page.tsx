import { Suspense } from "react";
import { Pods } from "@/concepts/call/pods";

export default function Page() {
  return (
    <Suspense>
      <Pods />
    </Suspense>
  );
}
