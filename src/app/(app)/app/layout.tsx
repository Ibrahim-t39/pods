// /app chrome: AppShell (the stage, Offline word, depth transitions, StoreGate). No tab bar, no rail, no demo strip.
// The shell reads the pathname, which suspends on dynamic routes under cacheComponents, so it sits in Suspense.
import { Suspense, type ReactNode } from "react";
import { AppShell, AppShellFallback } from "@/components/shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AppShellFallback />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
