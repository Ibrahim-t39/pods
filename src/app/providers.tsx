// [U0] Client providers for the whole site: MotionConfig (reduced motion = user), sonner Toaster, store boot.
"use client";

import { useEffect, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";
import { bootStore } from "@/lib/db/store";
import { DemoRuntime } from "@/components/demo";
import { Daypart } from "@/components/shell/daypart";

function StoreBoot() {
  useEffect(() => bootStore(), []);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 420, damping: 32 }}>
      <StoreBoot />
      <Daypart />
      <DemoRuntime />{/* hidden Director, SW register, install capture, member activity */}
      {children}
      <Toaster
        position="bottom-center"
        offset={{ bottom: "calc(88px + env(safe-area-inset-bottom))" }}
        mobileOffset={{ bottom: "calc(88px + env(safe-area-inset-bottom))" }}
        toastOptions={{
          unstyled: true,
          classNames: {
            toast:
              "flex w-full items-center justify-between gap-3 rounded-pill bg-ink px-5 py-3 text-body-sm font-medium text-white shadow-lg min-h-12",
            title: "font-medium",
            description: "text-neutral-300",
            actionButton: "ml-1 rounded-pill px-2 py-1 font-semibold text-signal-300 hover:text-white",
            cancelButton: "rounded-pill px-2 py-1 text-neutral-300",
            icon: "shrink-0",
          },
        }}
      />
    </MotionConfig>
  );
}
