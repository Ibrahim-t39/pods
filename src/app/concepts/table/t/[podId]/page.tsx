import { Suspense } from "react";
import { TableScreen } from "@/concepts/table/TableScreen";

export default function Page() {
  return (
    <Suspense>
      <TableScreen />
    </Suspense>
  );
}
