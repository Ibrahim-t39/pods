// Z01 404 for any unmatched URL.
import type { Metadata } from "next";
import { NotFoundView } from "@/components/shell/system-pages";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return <NotFoundView />;
}
