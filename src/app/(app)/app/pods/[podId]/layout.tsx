// A pod's table (V3_SPEC §6.3). The table lives in the layout so /details (the menu) and /plan/[id] (Why this plan)
// open over it as sheets and the table never re-mounts.
import { Suspense, type ReactNode } from "react";
import { PodTable } from "@/components/pods/pod-table";

export default function PodLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense>
        <PodTable />
      </Suspense>
      {children}
    </>
  );
}
