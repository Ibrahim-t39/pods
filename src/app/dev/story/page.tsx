// Dev-only preview of the landing scroll story and the bubble finish (MOTION_SYSTEM §3, §11). 404 in production.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoryLab } from "./lab";

export const metadata: Metadata = { title: "Story", robots: { index: false, follow: false } };

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <StoryLab />;
}
