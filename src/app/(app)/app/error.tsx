// Z02 inside the app.
"use client";

import { useEffect } from "react";
import { ErrorView } from "@/components/shell/system-pages";

export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;
  return <ErrorView inApp onRetry={retry} digest={digest} />;
}
