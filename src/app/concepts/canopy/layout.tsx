// CANOPY concept shell: fonts + surface CSS only. Each screen draws its own light (surface by state, PB 4.4).
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { mono, serif } from "@/concepts/canopy/fonts";
import "@/concepts/canopy/canopy.css";

export const metadata: Metadata = { title: { absolute: "Pods" } };

export default function CanopyLayout({ children }: { children: ReactNode }) {
  return <div className={`${serif.variable} ${mono.variable}`}>{children}</div>;
}
