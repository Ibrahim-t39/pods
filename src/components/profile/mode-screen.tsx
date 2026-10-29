// Demo / Live (PLATFORM_SPEC §M). ModePicker is two radio cards (Klaviyo-style): it sits inline at the top of Settings
// and alone on /app/settings/mode. Picking one opens that world at /app (first run there, or its front). Demo with no
// seat yet seats Chanda first (the Director's "Skip to placed"). Gates: "Demo" shows only inside data-allow-mode.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CirclesLoader } from "@/components/brand/circles-loader";
import { useHydrated, useMode, useRepo, useSetMode } from "@/lib/db/hooks";
import { useStore } from "@/lib/db/store";
import { skipToPlaced } from "@/lib/simulation/director";
import type { AppMode } from "@/lib/types";
import { MODE_LABEL } from "@/components/platform/mode-switch";
import { RingMark } from "./kit";
import { Section, YouHead, YouPage } from "./you-kit";

const SUB: Record<AppMode, string> = {
  live: "Your own profile, pods and plans.",
  demo: "Chanda’s week, already in motion.",
};

export function ModePicker() {
  const mode = useMode();
  const setMode = useSetMode();
  const repo = useRepo();
  const router = useRouter();
  const [busy, setBusy] = useState<AppMode | null>(null);
  const pick = async (m: AppMode) => {
    if (m === mode || busy) return;
    setBusy(m);
    await setMode(m);
    if (m === "demo") {
      const db = useStore.getState().db;
      if (!db.me || db.users[db.me]?.onboarding_step !== "done") await skipToPlaced(repo);
    }
    router.replace("/app");
  };
  return (
    <div data-allow-mode>
      <div className="yo-modes" role="radiogroup" aria-label="Mode">
        {(["live", "demo"] as const).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} disabled={!!busy} onClick={() => void pick(m)} className="yo-mode pressable">
            {busy === m ? <CirclesLoader size={24} label="Opening" /> : <RingMark on={mode === m} size={24} />}
            <span className="min-w-0">
              <span className="yo-mode-t">{MODE_LABEL[m]}</span>
              <span className="yo-mode-s">{SUB[m]}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="mt-s2 px-s1 text-[13px] text-ink-2">Switching keeps both. Nothing is lost.</p>
    </div>
  );
}

export function ModeScreen() {
  const hydrated = useHydrated();
  if (!hydrated) return null;
  return (
    <YouPage>
      <div data-allow-mode>
        <YouHead back="/app/settings" backLabel="Settings" title="Mode" sub="Pick which world the app shows." />
      </div>
      <div className="yo-wrap yo-body">
        <div className="max-w-[720px]">
          <Section>
            <ModePicker />
          </Section>
        </div>
      </div>
    </YouPage>
  );
}
