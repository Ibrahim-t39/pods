// Paths concept shell: fonts + surface CSS only. Each screen renders its own <Paper> (surface by state, PB 4.4).
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { sans, serif } from "@/concepts/paths/fonts";
import "@/concepts/paths/paths.css";

export const metadata: Metadata = { title: { absolute: "Pods" } };

export default function PathsLayout({ children }: { children: ReactNode }) {
  return <div className={`${serif.variable} ${sans.variable}`}>{children}</div>;
}
