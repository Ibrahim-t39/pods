// [U4] Dev-only planner lab: drives the Hoopers card through every state (?state=placed|locked|checkin|ballot|reveal|vote)
// so the card, trace and lock moment can be screenshotted without the Director. 404 in production builds.
import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlannerLab } from "./lab";

export const metadata: Metadata = { title: "Planner lab", robots: { index: false, follow: false } };

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense>
      <PlannerLab />
    </Suspense>
  );
}
