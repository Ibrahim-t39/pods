import { Suspense } from "react";
import { Landing } from "@/concepts/call/landing";

export default function Page() {
  return (
    <Suspense>
      <Landing />
    </Suspense>
  );
}
