// A kept old route that now lives elsewhere: replace the URL on the client (keeps the query string).
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageSkeleton } from "@/components/shell/store-gate";

export function Hop({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to + window.location.search);
  }, [router, to]);
  return <PageSkeleton />;
}
