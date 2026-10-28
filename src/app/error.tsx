// [U5] SY-03 error boundary for the whole site (below the root layout).
"use client";

import { useEffect } from "react";
import { ErrorView } from "@/components/shell/system-pages";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;
  return <ErrorView onRetry={retry} digest={digest} />;
}
