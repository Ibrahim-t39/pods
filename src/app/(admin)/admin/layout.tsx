// Admin layout. Not public: production builds drop the route unless PODS_ADMIN=1 is set at build time, and every
// build opens it only behind the Director trigger or ?admin=1 (OpsGate). Real sign-in for staff is a launch item
// (library C #8).
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { OpsGate } from "@/components/admin/ops-gate";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production" && process.env.PODS_ADMIN !== "1") notFound();
  return (
    <OpsGate>
      <AdminShell>{children}</AdminShell>
    </OpsGate>
  );
}
