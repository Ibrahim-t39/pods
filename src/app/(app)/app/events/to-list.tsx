// Client-side hand-off to the Room's list view. A server redirect() here trips the dev-time `instant` validation
// under cacheComponents, so the move happens after mount (nothing renders in between).
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ToList() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/app/pods?view=list");
  }, [router]);
  return null;
}
