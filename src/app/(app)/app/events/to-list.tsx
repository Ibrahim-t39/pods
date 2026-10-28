// Client-side hand-off to Plans (PLATFORM_SPEC §B: /app/events maps to the Plans destination). A server redirect() here trips the dev-time `instant` validation
// under cacheComponents, so the move happens after mount (nothing renders in between).
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ToList() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/app/plans");
  }, [router]);
  return null;
}
