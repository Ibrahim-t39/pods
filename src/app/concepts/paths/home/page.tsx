import { Suspense } from "react";
import { Home } from "@/concepts/paths/Home";

export default function Page() {
  return (
    <Suspense>
      <Home />
    </Suspense>
  );
}
