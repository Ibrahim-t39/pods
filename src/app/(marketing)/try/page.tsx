// /try: the playable demo (Fit, Pod, Plan, I'm in, Repeat), moved off the landing so the landing is scroll-only.
import type { Metadata } from "next";
import { TryPage } from "@/components/marketing/try-page";

export const metadata: Metadata = { title: "Try it", description: "Play a pod from fit to the second hangout. No account." };

export default function Try() {
  return <TryPage />;
}
