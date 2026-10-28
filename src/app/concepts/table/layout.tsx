// TABLE concept shell: fonts + surface CSS only. Each place (Doorway, Room, Table) renders its own <Paper>.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { tbMono, tbSerif } from "@/concepts/table/fonts";
import "@/concepts/table/table.css";

export const metadata: Metadata = { title: { absolute: "Pods" } };

export default function TableLayout({ children }: { children: ReactNode }) {
  return <div className={`${tbSerif.variable} ${tbMono.variable}`}>{children}</div>;
}
