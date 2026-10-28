// Your seat (wireframe Y01; template.md anatomy F; V3_SPEC §6.5; PLATFORM_SPEC §F10 "You"; QA round 1).
// What you told us, as labelled fields: a quiet label, the value, an edit mark, each one tap to the sheet that changes
// it. The photo is the first field (tap to add or change). Under them, two labelled rows: Settings (/app/settings,
// where Mode, privacy, sign out and delete live) and If something's off (/app/safety). No toggle wall (J #7).
//
//   phone   mark · "Chanda, 22." (bold lg, condenses into a glass bar on scroll) · 24 · six 72px fields on
//           hairlines · 32 · two 56px labelled rows · 48 · your seat at the table · room for the floating nav
//   laptop  the 520 text column on the left, your seat at the table on the right (anatomy F + PB 1.1)
// Motion (MOTION_SYSTEM §4, §10): rows arrive on STAGGER; the table is the `you` shared element.
//
// Sheets are addressed by ?sheet=. The account sheets (more, privacy, blocked, delete) moved to /app/settings; old
// addresses are forwarded there. While a sheet is open, the field it changes stays lit and the others step back.
"use client";

import { useEffect, useRef } from "react";
import { Disc } from "@/components/brand/disc";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Stage } from "@/components/brand/stage";
import { TableRing, GENTLE, type Seat } from "@/components/brand/table-ring";
import { STAGGER } from "@/components/brand/motion";
import { PullCircles } from "@/components/brand/pull-circles";
import { Shared, sharedName } from "@/components/brand/shared";
import { CondensingHead } from "@/components/shell/condensing-head";
import { useStore } from "@/lib/db/store";
import { notify } from "@/components/ui";
import { useDb, useHydrated, useMe, useRepo } from "@/lib/db/hooks";
import { nowISO } from "@/lib/time/clock";
import { displayName, toPublicMember } from "@/lib/utils";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { useSeatPrefs } from "./local-prefs";
import { FieldRow, Rows, SheetRow } from "./kit";
import { freeLine, likesLine, textsValue, valueOf } from "./words";
import { AiSheet, CommunitySheet, FreeSheet, LikesSheet, SEAT_SHEETS, TextsSheet, type SeatSheet } from "./seat-sheets";
import "./seat.css";

/** Sheets that live on /app/settings now; an old Your seat address is forwarded there. */
const MOVED: Partial<Record<SeatSheet, string>> = { more: "", privacy: "privacy", blocked: "blocked", delete: "delete" };

export function YourSeat() {
  const me = useMe();
  const hydrated = useHydrated();
  const wide = useMediaQuery("(min-width: 1024px)");
  const router = useRouter();
  const sp = useSearchParams();
  const asked = sp.get("sheet");
  // old addresses: ?sheet=claude is the AI sheet now; ?sheet=help is the If something's off page
  const raw = (asked === "claude" ? "ai" : asked) as SeatSheet | null;
  const sheet = raw && SEAT_SHEETS.includes(raw) ? raw : null;
  useEffect(() => {
    if (asked === "help") router.replace("/app/safety");
    else if (raw && raw in MOVED) router.replace(MOVED[raw] ? `/app/settings?sheet=${MOVED[raw]}` : "/app/settings");
  }, [asked, raw, router]);
  // no seat in this world yet (a fresh Live, or signed out): /app routes to first run
  useEffect(() => {
    if (hydrated && !me) router.replace("/app");
  }, [hydrated, me, router]);
  const repo = useRepo();
  const file = useRef<HTMLInputElement>(null);
  function pickPhoto(f: File | undefined) {
    if (!f || !me) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const r = await repo.setPhotos([String(reader.result), ...me.photo_urls.slice(1)]);
      if (r.ok) notify("Photo saved");
      else notify.error("Photo not saved. Try a JPG or PNG.");
    };
    reader.readAsDataURL(f);
  }
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
  const photo = me.photo_urls[0];
  const rows: { key: SeatSheet; label: string; value: string }[] = [
    { key: "likes", label: "Into", value: valueOf(likesLine(likes), "Into ") },
    { key: "free", label: "Free", value: valueOf(freeLine(me.availability), "Free ") },
    { key: "community", label: "Community pods", value: community ? "On" : "Off" },
    { key: "texts", label: "Texts", value: textsValue(me.notification_prefs.sms, prefs.texts) },
    { key: "ai", label: "AI plans", value: prefs.claude ? "On" : "Off" },
  ];
  const owner = sheet && !(sheet in MOVED) ? sheet : null;
  const seats: Seat[] = [{ in: true, ink: true, initial: name.slice(0, 1) }, { open: true }, { open: true }, { open: true }];

  return (
    <div className="seat-pg">
      <Stage light="paper" />
      <PullCircles label="Refreshing your seat" onRefresh={() => useStore.persist.rehydrate()} />
      <CondensingHead
        left="mark"
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
            <motion.li initial={{ opacity: 0, y: 12 }} animate={{ opacity: owner ? 0.32 : 1, y: 0 }} transition={{ ...GENTLE, delay: owner ? 0 : 0.08 }}>
              <FieldRow
                label="Photo"
                value={photo ? "Change photo" : "Add a photo"}
                lead={
                  photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt="" className="size-10 shrink-0 rounded-full object-cover" />
                  ) : (
                    <Disc initial={name.slice(0, 1)} size={40} />
                  )
                }
                onClick={() => file.current?.click()}
              />
              <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
            </motion.li>
            {rows.map((r, i) => (
              <motion.li
                key={r.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: owner && owner !== r.key ? 0.32 : 1, y: 0 }}
                transition={{ ...GENTLE, delay: owner ? 0 : 0.08 + (i + 1) * STAGGER }}
              >
                <FieldRow label={r.label} value={<span data-nc={r.key === "likes" || undefined}>{r.value}</span>} expanded={owner === r.key} onClick={() => go(r.key)} />
              </motion.li>
            ))}
          </ul>

          <motion.div className="seat-quiet" initial={{ opacity: 0 }} animate={{ opacity: owner ? 0.32 : 1 }} transition={{ ...GENTLE, delay: owner ? 0 : 0.4 }}>
            <Rows label="More of your seat">
              <SheetRow icon="more" tone="quiet" label="Settings" href="/app/settings" arrow />
              <SheetRow icon="here" label="If something’s off" href="/app/safety" arrow />
            </Rows>
          </motion.div>
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
      <AiSheet open={sheet === "ai"} onClose={close} />
    </div>
  );
}
