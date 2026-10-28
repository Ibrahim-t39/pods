// Your seat (wireframe Y01; template.md anatomy F; V3_SPEC §6.5).
// What you told us, said back as sentences. Each sentence is one tap to the sheet that changes it; help, legal,
// sign out and delete sit behind one quiet row. No toggle wall (J #7), no theme switch, no photo grid, 7 taps.
//
//   phone   back glyph · "Chanda, 22." (bold lg, condenses into a glass bar on scroll) · 24 · five 28px rows on
//           hairlines · 32 · "Help, legal, sign out" · your seat at the table (pull down: the circles refresh)
//   laptop  the 520 text column on the left, your seat at the table on the right (anatomy F + PB 1.1)
// Motion (MOTION_SYSTEM §4, §10): rows arrive on STAGGER; the quiet row and the table settle in; the table is the
// `you` shared element (the seat glyph top right travels into it). One hero motion: the table arriving.
//
// Sheets are addressed by ?sheet= so the old /app/settings/* routes can land on the right one. While a sheet is
// open, the sentence it changes stays lit and the others step back, so you always see what you are editing.
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Stage } from "@/components/brand/stage";
import { TableRing, GENTLE, type Seat } from "@/components/brand/table-ring";
import { STAGGER } from "@/components/brand/motion";
import { PullCircles } from "@/components/brand/pull-circles";
import { Shared, sharedName } from "@/components/brand/shared";
import { Icon } from "@/components/icons";
import { CondensingHead } from "@/components/shell/condensing-head";
import { useStore } from "@/lib/db/store";
import { DeleteAccountFlow } from "@/components/safety";
import { notify } from "@/components/ui";
import { useDb, useHydrated, useMe } from "@/lib/db/hooks";
import { signOut } from "@/lib/safety/sign-out";
import { nowISO } from "@/lib/time/clock";
import { displayName, toPublicMember } from "@/lib/utils";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { useSeatPrefs } from "./local-prefs";
import { freeLine, likesLine, textsLine } from "./words";
import {
  BlockedSheet,
  ClaudeSheet,
  CommunitySheet,
  FreeSheet,
  HelpSheet,
  LikesSheet,
  MoreSheet,
  PrivacySheet,
  SEAT_SHEETS,
  TextsSheet,
  type SeatSheet,
} from "./seat-sheets";
import "./seat.css";

/** Which sentence a sheet belongs to (the More family belongs to the quiet row). */
const OWNER: Record<SeatSheet, string> = {
  likes: "likes",
  free: "free",
  community: "community",
  texts: "texts",
  claude: "claude",
  more: "more",
  help: "more",
  privacy: "more",
  blocked: "more",
  delete: "more",
};

export function YourSeat() {
  const me = useMe();
  const hydrated = useHydrated();
  const wide = useMediaQuery("(min-width: 1024px)");
  const router = useRouter();
  const sp = useSearchParams();
  const raw = sp.get("sheet") as SeatSheet | null;
  const sheet = raw && SEAT_SHEETS.includes(raw) ? raw : null;
  const { prefs } = useSeatPrefs();
  const likes = useDb((db) =>
    db.userInterests
      .filter((u) => u.user_id === db.me)
      .map((u) => db.interests[u.interest_id])
      .filter(Boolean)
      .map((i) => ({ id: i.id, label: i.label })),
  );
  const community = useDb((db) => !!(db.me && db.identities[db.me] && (db.identities[db.me].heritage || db.identities[db.me].faith)));

  const go = (s: SeatSheet) => router.replace(`/app/profile?sheet=${s}`, { scroll: false });
  const close = () => router.replace("/app/profile", { scroll: false });

  if (!hydrated || !me) return null;

  const age = toPublicMember(me, nowISO()).age;
  const name = displayName(me);
  const rows: { key: SeatSheet; text: string }[] = [
    { key: "likes", text: likesLine(likes) },
    { key: "free", text: freeLine(me.availability) },
    { key: "community", text: community ? "Community pods on." : "Community pods off." },
    { key: "texts", text: textsLine(me.notification_prefs.sms, prefs.texts) },
    { key: "claude", text: prefs.claude ? "Claude plans, on." : "Claude plans, off." },
  ];
  const owner = sheet ? OWNER[sheet] : null;
  const seats: Seat[] = [{ in: true, ink: true, initial: name.slice(0, 1) }, { open: true }, { open: true }, { open: true }];

  return (
    <div className="seat-pg">
      <Stage light="paper" />
      <PullCircles label="Refreshing your seat" onRefresh={() => useStore.persist.rehydrate()} />
      <CondensingHead
        left="back"
        backHref="/app/pods"
        backLabel="Your pods"
        size="lg"
        compact={`${name}, ${age}`}
        className="seat-head"
        title={
          <span data-nc>
            {name}, {age}.
          </span>
        }
      />

      <div className="seat-body">
        <div className="seat-col">
          <ul className="seat-rows" aria-label="What you told us">
            {rows.map((r, i) => (
              <motion.li
                key={r.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: owner && owner !== r.key ? 0.32 : 1, y: 0 }}
                transition={{ ...GENTLE, delay: owner ? 0 : 0.08 + i * STAGGER }}
              >
                <button type="button" className="seat-row pressable" aria-haspopup="dialog" aria-expanded={owner === r.key} onClick={() => go(r.key)}>
                  <span className="line">{r.text}</span>
                </button>
              </motion.li>
            ))}
          </ul>

          <motion.button
            type="button"
            className="seat-more pressable settle"
            aria-haspopup="dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: owner && owner !== "more" ? 0.32 : 1 }}
            transition={{ ...GENTLE, delay: owner ? 0 : 0.4 }}
            onClick={() => go("more")}
          >
            <Icon name="more" size={22} />
            <span className="flex-1">Help, legal, sign out</span>
            <Icon name="arrow" size={20} className="text-ink-2" />
          </motion.button>
        </div>

        {/* the object: your seat at a table that is waiting for you. On laptop it steps aside for a sheet. */}
        <div className="seat-obj settle">
          <Shared name={sharedName.you}>
            <motion.div
              aria-hidden
              initial={{ opacity: 0, scale: 0.94 }}
              animate={wide && sheet ? { opacity: 1, scale: 0.62, x: -240, y: 80 } : { opacity: 1, scale: 1, x: 0, y: 0 }}
              transition={GENTLE}
            >
              <TableRing size={wide ? 400 : 168} seats={seats} names={false} youWaiting={false} />
            </motion.div>
          </Shared>
        </div>
      </div>

      <LikesSheet open={sheet === "likes"} onClose={close} />
      <FreeSheet open={sheet === "free"} onClose={close} />
      <CommunitySheet open={sheet === "community"} onClose={close} />
      <TextsSheet open={sheet === "texts"} onClose={close} />
      <ClaudeSheet open={sheet === "claude"} onClose={close} />
      <MoreSheet
        open={sheet === "more"}
        onClose={close}
        go={go}
        onSignOut={() => {
          signOut();
          router.replace("/");
        }}
      />
      <HelpSheet open={sheet === "help"} onClose={close} go={go} />
      <PrivacySheet open={sheet === "privacy"} onClose={close} />
      <BlockedSheet open={sheet === "blocked"} onClose={close} />
      <DeleteAccountFlow open={sheet === "delete"} onOpenChange={(o) => !o && close()} onDeleted={() => {
          router.replace("/");
          notify("Your seat is cleared.");
        }} />
    </div>
  );
}
