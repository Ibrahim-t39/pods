import { Suspense } from "react";
import { Landing } from "@/concepts/paths/Landing";

export default function Page() {
  return (
    <Suspense>
      <Landing />
    </Suspense>
  );
}
