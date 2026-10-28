import { Suspense } from "react";
import { Doorway } from "@/concepts/table/Doorway";

export default function Page() {
  return (
    <Suspense>
      <Doorway />
    </Suspense>
  );
}
