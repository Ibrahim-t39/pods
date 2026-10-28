// [U1] Dev-only design system sandbox: every components/ui + components/brand primitive, light and dark.
// Not linked from the product; 404 in production builds. (The public brand board is /brand, owned by U10.)
import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Showcase } from "./showcase";

export const metadata: Metadata = { title: "Design system", robots: { index: false, follow: false } };

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense>
      <Showcase />
    </Suspense>
  );
}
