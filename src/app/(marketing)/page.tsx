// The Doorway (/), wireframes A01-A03. See components/marketing/doorway.tsx.
import type { Metadata } from "next";
import { Doorway } from "@/components/marketing/doorway";

export const metadata: Metadata = {
  title: { absolute: "Pods" },
  description: "Small friend groups that meet again.",
};

export default function LandingPage() {
  return <Doorway />;
}
