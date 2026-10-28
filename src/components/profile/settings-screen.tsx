// /app/settings (QA round 1; PLATFORM_SPEC §F10 Settings; wireframe Y06 grown into a page). Reached from Your seat ›
// Settings. Labelled 56px rows in four groups, each one job (DESIGN §9: rows touch inside a group, s8 between):
//   Notifications   Texts · AI plans                                (sheets shared with Your seat)
//   Privacy         Privacy and terms (sheet: hide names, download, the AI disclosure) · Blocked · If something's off
//   App             Mode (Live / Demo, the only place the word shows; data-allow-mode) · Help (write to us)
//   apart           Sign out, then, apart again, Delete my seat (its own confirm sheet, Y03)
// No toggle wall (J #7): every choice is one tap to a sheet with ring rows. Appearance is not offered: Pods has one
// theme (lib/theme.ts); a dark set of tokens is a foundation change.
//   phone   back to Your seat · "Settings." · 24 · the groups · room for the floating nav
//   laptop  the 520 column on the left (anatomy F)
"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Stage } from "@/components/brand/stage";
import { GENTLE, STAGGER } from "@/components/brand/motion";
import { CondensingHead } from "@/components/shell/condensing-head";
import { notify } from "@/components/ui";
import { useHydrated, useMe, useMode } from "@/lib/db/hooks";
import { signOut } from "@/lib/safety/sign-out";
import { DeleteAccountFlow, WRITE_TO_US, useBlockedPeople } from "@/components/safety";
import { Apart, GroupLabel, Rows, SheetRow } from "./kit";
import { useSeatPrefs } from "./local-prefs";
import { textsValue } from "./words";
import { AiSheet, BlockedSheet, PrivacySheet, TextsSheet } from "./seat-sheets";
import "./seat.css";

type SettingsSheet = "texts" | "ai" | "privacy" | "blocked" | "delete";
const SHEETS: SettingsSheet[] = ["texts", "ai", "privacy", "blocked", "delete"];

export function SettingsScreen() {
  const hydrated = useHydrated();
  const me = useMe();
  const mode = useMode();
  const router = useRouter();
  const sp = useSearchParams();
  const asked = sp.get("sheet") as SettingsSheet | null;
  const sheet = asked && SHEETS.includes(asked) ? asked : null;
  const { prefs } = useSeatPrefs();
  const blocked = useBlockedPeople().length;
  const leaving = useRef(false); // sign out and delete go to the start, not to first run
  useEffect(() => {
    if (hydrated && !me && !leaving.current) router.replace("/app");
  }, [hydrated, me, router]);

  const go = (s: SettingsSheet) => router.replace(`/app/settings?sheet=${s}`, { scroll: false });
  const close = () => router.replace("/app/settings", { scroll: false });

  if (!hydrated || !me) return null;

  const groups = [
    <div key="notify">
      <GroupLabel>Notifications</GroupLabel>
      <Rows label="Notifications">
        <SheetRow icon="bell" tone="quiet" label="Texts" value={textsValue(me.notification_prefs.sms, prefs.texts)} arrow onClick={() => go("texts")} />
        <SheetRow icon="clock" tone="quiet" label="AI plans" value={prefs.claude ? "On" : "Off"} arrow onClick={() => go("ai")} />
      </Rows>
    </div>,
    <div key="privacy">
      <GroupLabel>Privacy</GroupLabel>
      <Rows label="Privacy">
        <SheetRow icon="why" label="Privacy and terms" arrow onClick={() => go("privacy")} />
        <SheetRow icon="block" label="Blocked" value={<span className="tabular-nums">{blocked ? blocked : "No one"}</span>} arrow onClick={() => go("blocked")} />
        <SheetRow icon="here" label="If something’s off" href="/app/safety" arrow />
      </Rows>
    </div>,
    <div key="app">
      <GroupLabel>App</GroupLabel>
      <Rows label="App">
        <span data-allow-mode className="contents">
          <SheetRow icon="again" tone="quiet" label="Mode" value={mode === "demo" ? "Demo" : "Live"} href="/app/settings/mode" arrow />
        </span>
        <SheetRow icon="talk" tone="quiet" label="Help" value="Write to us" href={WRITE_TO_US} external />
      </Rows>
    </div>,
    <div key="account">
      <Rows label="Account">
        <SheetRow
          icon="back"
          tone="quiet"
          label="Sign out"
          onClick={() => {
            leaving.current = true;
            signOut();
            router.replace("/");
          }}
        />
      </Rows>
      <Apart>
        <Rows>
          <SheetRow icon="off" tone="quiet" label="Delete my seat" arrow onClick={() => go("delete")} />
        </Rows>
      </Apart>
    </div>,
  ];

  return (
    <div className="seat-pg">
      <Stage light="paper" />
      <CondensingHead left="back" backHref="/app/profile" backLabel="Your seat" size="lg" title="Settings." compact="Settings" className="seat-head" />
      <div className="seat-body">
        <div className="seat-col safe-col">
          {groups.map((g, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...GENTLE, delay: 0.06 + i * STAGGER }}>
              {g}
            </motion.div>
          ))}
        </div>
      </div>

      <TextsSheet open={sheet === "texts"} onClose={close} />
      <AiSheet open={sheet === "ai"} onClose={close} />
      <PrivacySheet open={sheet === "privacy"} onClose={close} />
      <BlockedSheet open={sheet === "blocked"} onClose={close} />
      <DeleteAccountFlow
        open={sheet === "delete"}
        onOpenChange={(o) => !o && close()}
        onBefore={() => (leaving.current = true)}
        onDeleted={() => {
          leaving.current = true;
          router.replace("/");
          notify("Your seat is cleared.");
        }}
      />
    </div>
  );
}
