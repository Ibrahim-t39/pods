// Call concept shell: two fonts + the concept's surface CSS. Each screen renders its own <Stage>.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { mono, serif } from "@/concepts/call/fonts";
import "@/concepts/call/call.css";

export const metadata: Metadata = { title: { absolute: "Pods" } };

export default function CallLayout({ children }: { children: ReactNode }) {
  return <div className={`${serif.variable} ${mono.variable}`}>{children}</div>;
}
