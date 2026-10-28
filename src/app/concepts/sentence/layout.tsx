// Sentence concept shell: fonts + surface CSS only. Every screen renders its own <Stage> (surface by state).
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { mono, serif } from "@/concepts/sentence/fonts";
import "@/concepts/sentence/sentence.css";

export const metadata: Metadata = { title: { absolute: "Pods" } };

export default function SentenceLayout({ children }: { children: ReactNode }) {
  return <div className={`${serif.variable} ${mono.variable}`}>{children}</div>;
}
