// Admin layout. Authorization is a launch item (library C #8); proxy.ts is reserved for it.
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata = { title: "Admin", robots: { index: false } };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
