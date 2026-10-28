import { Suspense } from "react";
import { Room } from "@/concepts/table/Room";

export default function Page() {
  return (
    <Suspense>
      <Room />
    </Suspense>
  );
}
