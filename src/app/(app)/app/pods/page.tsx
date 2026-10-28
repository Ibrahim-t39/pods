// Your pods: the Room (V3_SPEC §6.3, wireframes C01-C08).
import { Suspense } from "react";
import { Room } from "@/components/pods/room";

export default function Page() {
  return (
    <Suspense>
      <Room />
    </Suspense>
  );
}
