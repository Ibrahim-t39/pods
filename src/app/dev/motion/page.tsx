// Dev-only motion lab (MOTION_SYSTEM §9): every life primitive on one scrolling page, so captures can check them.
// Not linked from the product; 404 in production builds.
import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MotionLab } from "./lab";

export const metadata: Metadata = { title: "Motion", robots: { index: false, follow: false } };

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense>
      <MotionLab />
    </Suspense>
  );
}
