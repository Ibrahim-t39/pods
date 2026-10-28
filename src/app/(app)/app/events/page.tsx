// Hangouts are no longer a section (V3_SPEC §2): the Room's list view shows what is next, by pod.
import { Suspense } from "react";
import { ToList } from "./to-list";

export default function Page() {
  return (
    <Suspense>
      <ToList />
    </Suspense>
  );
}
