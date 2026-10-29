// The landing (/): a film in eight chapters, played by scroll. See components/marketing/film.tsx.
import type { Metadata } from "next";
import { Film } from "@/components/marketing/film";
import { LandingSwitch } from "@/components/marketing/landing-switch";

export const metadata: Metadata = {
  title: { absolute: "Pods" },
  description: "Find your people. Then keep them. Small local friend groups that meet again and again.",
};

export default function LandingPage() {
  return (
    <>
      <Film />
      <LandingSwitch />
    </>
  );
}
