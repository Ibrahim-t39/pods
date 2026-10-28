// Platform §M: the Demo / Live switch (the account menu and anywhere a compact switch fits). Both worlds are kept;
// switching never loses data. A pill with a sliding bead under the chosen word (the select blue, COLOR_LIFE §10.1).
// The full screen version is /app/settings/mode (components/profile/mode-screen.tsx).
// Gates: the word "Demo" is allowed only inside [data-allow-mode] (PLATFORM_SPEC §A #5).
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { SNAPPY } from "@/components/brand/motion";
import { useMode, useSetMode } from "@/lib/db/hooks";
import type { AppMode } from "@/lib/types";
import { cn } from "@/lib/cn";

export const MODE_LABEL: Record<AppMode, string> = { demo: "Demo", live: "Live" };
export const MODES: AppMode[] = ["live", "demo"];

/** Switch worlds, then let /app route you to first run or your front in that world. */
export function useSwitchMode() {
  const mode = useMode();
  const setMode = useSetMode();
  const router = useRouter();
  const [busy, setBusy] = useState<AppMode | null>(null);
  const pick = async (m: AppMode) => {
    if (m === mode || busy) return;
    setBusy(m);
    await setMode(m);
    router.replace("/app");
  };
  return { mode, busy, pick };
}

export function ModeSwitch({ className }: { className?: string }) {
  const { mode, busy, pick } = useSwitchMode();
  return (
    <div data-allow-mode role="radiogroup" aria-label="Mode" className={cn("relative inline-flex rounded-full bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] p-1", className)}>
      {MODES.map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          disabled={!!busy}
          onClick={() => void pick(m)}
          className={cn("pressable relative min-h-11 min-w-[88px] rounded-full px-s4 text-[15px] font-semibold outline-offset-2", mode === m ? "text-on-select" : "text-ink-2")}
        >
          {mode === m && <motion.span layoutId="mode-bead" aria-hidden className="sheen absolute inset-0 rounded-full bg-select" transition={SNAPPY} />}
          <span className="relative">{MODE_LABEL[m]}</span>
        </button>
      ))}
    </div>
  );
}
