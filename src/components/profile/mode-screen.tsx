// /app/settings/mode: Demo or Live (PLATFORM_SPEC §M; reached from You › Mode). Two sentence rows, the Your seat
// grammar: a ring on the left fills in the select blue when chosen. Picking one fades the page and opens that world
// at /app (first run there, or its front). Demo with no seat yet seats Chanda first (the Director's "Skip to placed"),
// so "Chanda's week" opens her week, not an empty first run (QA r1). One line under them says nothing is lost.
//   phone   back · "Mode." · 24 · two 28px rows with a 16px line under each · 24 · the reassurance line
//   laptop  the 520 column on the left; two people-circles on the right: the world you are in is the one in colour
// Gates: "Demo" is allowed on this screen only (data-allow-mode, PLATFORM_SPEC §A #5).
"use client";

import { motion } from "motion/react";
import { Stage } from "@/components/brand/stage";
import { GENTLE, STAGGER } from "@/components/brand/motion";
import { CirclesLoader } from "@/components/brand/circles-loader";
import { CondensingHead } from "@/components/shell/condensing-head";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useHydrated, useMode, useRepo, useSetMode } from "@/lib/db/hooks";
import { useStore } from "@/lib/db/store";
import { skipToPlaced } from "@/lib/simulation/director";
import type { AppMode } from "@/lib/types";
import { MODE_LABEL } from "@/components/platform/mode-switch";
import { RingMark, SheetLine } from "./kit";
import "./seat.css";

const SUB: Record<AppMode, string> = { live: "Your own seat.", demo: "Chanda’s week." };

export function ModeScreen() {
  const hydrated = useHydrated();
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
  if (!hydrated) return null;

  return (
    <div className="seat-pg" data-allow-mode>
      <Stage light="paper" />
      <CondensingHead left="back" backHref="/app/settings" backLabel="Settings" size="lg" title="Mode." compact="Mode" className="seat-head" />
      <div className="seat-body">
        <div className="seat-col">
          <motion.ul className="seat-rows" role="radiogroup" aria-label="Mode" animate={{ opacity: busy ? 0.4 : 1 }} transition={GENTLE}>
            {(["live", "demo"] as const).map((m, i) => (
              <motion.li key={m} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...GENTLE, delay: 0.08 + i * STAGGER }}>
                <button type="button" role="radio" aria-checked={mode === m} disabled={!!busy} onClick={() => void pick(m)} className="seat-row mode-row pressable">
                  <RingMark on={mode === m} size={28} />
                  <span className="min-w-0">
                    <span className="line block">{MODE_LABEL[m]}.</span>
                    <span className="mode-sub">{SUB[m]}</span>
                  </span>
                </button>
              </motion.li>
            ))}
          </motion.ul>
          <SheetLine className="mt-s6">Switching keeps both.</SheetLine>
          {busy && (
            <div className="mt-s8 flex items-center gap-s4">
              <CirclesLoader size={40} label="Opening" />
            </div>
          )}
        </div>
        <div className="mode-obj" aria-hidden>
          {(["live", "demo"] as const).map((m) => (
            <motion.span
              key={m}
              className="mode-orb"
              data-on={mode === m || undefined}
              animate={{ scale: mode === m ? 1 : 0.82, opacity: mode === m ? 1 : 0.55 }}
              transition={GENTLE}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
