// The sheets behind Your seat (wireframes Y02, Y03, Y06, B03s; V3_SPEC §6.5). Each sentence on Your seat opens one.
// One sheet at a time: opening one from another replaces it (DESIGN.md §10). Every sheet holds 15 words or fewer
// (a list sheet 24), at most one filled primary, choices as ring rows (never switches; J #7).
"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Button, Chip, ResponsiveSheet, notify } from "@/components/ui";
import { Disc } from "@/components/brand/disc";
import { SNAPPY } from "@/components/brand/table-ring";
import { useDb, useMe, useRepo } from "@/lib/db/hooks";
import { faithLadder, faithNode, heritageLadder, heritageNode } from "@/data/taxonomy";
import type { FaithValue, HeritageValue, Slot } from "@/lib/types";
import { BlockedList, PrivacyCenter, SafetyCenter } from "@/components/safety";
import { Apart, PageName, ChoiceRow, Rows, SheetFoot, SheetLine, SheetRow, GoLink, RingMark } from "./kit";
import { useSeatPrefs } from "./local-prefs";
import { TEXT_KINDS, shortLike } from "./words";

export type SeatSheet = "likes" | "free" | "community" | "texts" | "claude" | "more" | "help" | "privacy" | "blocked" | "delete";
export const SEAT_SHEETS: SeatSheet[] = ["likes", "free", "community", "texts", "claude", "more", "help", "privacy", "blocked", "delete"];

type SheetProps = { open: boolean; onClose: () => void };
const done = (onClose: () => void) => <SheetFoot right={<Button onClick={onClose}>Done</Button>} />;

/* ── Likes (from "Into basketball, guitar.") ─────────────────────────────────────────────────────────────────────────── */

export function LikesSheet({ open, onClose }: SheetProps) {
  const repo = useRepo();
  const me = useMe();
  const all = useDb((db) => Object.values(db.interests).filter((i) => i.active));
  const mine = useDb((db) => db.userInterests.filter((u) => u.user_id === db.me).map((u) => u.interest_id));
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(id: string, on: boolean) {
    setBusy(id);
    const r = on ? await repo.addInterest(id) : await repo.removeInterest(id);
    setBusy(null);
    if (!r.ok) notify.error("Not saved. Try again.");
  }

  function pickPhoto(f: File | undefined) {
    if (!f || !me) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const r = await repo.setPhotos([String(reader.result), ...me.photo_urls.slice(1)]);
      if (!r.ok) notify.error("Photo not saved. Try a JPG or PNG.");
    };
    reader.readAsDataURL(f);
  }

  const photo = me?.photo_urls[0];
  return (
    <ResponsiveSheet open={open} onOpenChange={(o) => !o && onClose()} title="You’re into" footer={done(onClose)}>
      <PageName>Your seat</PageName>
      <div className="flex flex-wrap gap-s2" role="group" aria-label="You’re into">
        {all.map((i) => {
          const on = mine.includes(i.id);
          const word = shortLike(i.id, i.label);
          return (
            <Chip key={i.id} size="sm" selected={on} className={on ? "border-select bg-select text-on-select" : "hover:border-select"} disabled={busy === i.id || (on && mine.length === 1)} onSelectedChange={(v) => toggle(i.id, v)}>
              {word.charAt(0).toUpperCase() + word.slice(1)}
            </Chip>
          );
        })}
      </div>
      <div className="mt-s8 flex items-center gap-s4 border-t border-line pt-s4">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="size-14 rounded-full object-cover" />
        ) : (
          <Disc initial={me?.first_name.slice(0, 1)} size={56} />
        )}
        <GoLink onClick={() => file.current?.click()}>{photo ? "Change photo" : "Add a photo"}</GoLink>
        <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
      </div>
    </ResponsiveSheet>
  );
}

/* ── Free (from "Free weekends, afternoons.") ──────────────────────────────────────────────────────────────────── */

const PARTS = [
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
] as const;
const DAYS = [
  { key: "saturday", label: "Sat" },
  { key: "sunday", label: "Sun" },
] as const;

/** Free times as a field of seats: each one fills when you tap it. */
export function FreeSheet({ open, onClose }: SheetProps) {
  const repo = useRepo();
  const me = useMe();
  const slots = me?.availability ?? [];

  async function toggle(s: Slot) {
    if (!me) return;
    const next = slots.includes(s) ? slots.filter((x) => x !== s) : [...slots, s];
    const days = me.blocked_days.filter((d) => !next.some((x) => x.startsWith(d)));
    const r = await repo.setAvailability(next, days);
    if (!r.ok) notify.error("Not saved. Try again.");
  }

  const seat = (s: Slot, label: string) => {
    const on = slots.includes(s);
    return (
      <button key={s} type="button" role="checkbox" aria-checked={on} aria-label={label} onClick={() => toggle(s)} className="pressable grid size-14 place-items-center rounded-full outline-offset-2">
        <RingMark on={on} size={32} />
      </button>
    );
  };

  return (
    <ResponsiveSheet open={open} onOpenChange={(o) => !o && onClose()} title="When you’re free" footer={done(onClose)}>
      <PageName>Your seat</PageName>
      <div className="grid grid-cols-[88px_repeat(3,56px)] items-center justify-between gap-y-s2 text-label text-ink-2">
        <span />
        {PARTS.map((p) => (
          <span key={p.key} className="text-center text-caption">
            {p.label}
          </span>
        ))}
        {DAYS.map((d) => (
          <FreeRow key={d.key} label={d.label}>
            {PARTS.map((p) => seat(`${d.key}-${p.key}` as Slot, `${d.label} ${p.label.toLowerCase()}`))}
          </FreeRow>
        ))}
        <FreeRow label="Weeknights">
          <span />
          <span />
          {seat("weekday-evening", "Weeknight evenings")}
        </FreeRow>
      </div>
    </ResponsiveSheet>
  );
}

function FreeRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <span className="text-[16px] text-ink">{label}</span>
      {children}
    </>
  );
}

/* ── Community pods (B03s): opt-in, members only, never shown to anyone else ──────────────────────────────────── */

type Opt = { key: string; label: string; heritage?: HeritageValue; faith?: FaithValue };
/** One row per community pod family. A pick that sits under a row is shown in its own words ("Zambian" under
 *  Southern African, "Seventh-day Adventist" under Christian), so the sheet says back exactly what you chose. */
const COMMUNITY: Opt[] = [
  { key: "southern_african", label: "Southern African", heritage: { level: "region", code: "southern_african" } },
  { key: "west_african", label: "West African", heritage: { level: "region", code: "west_african" } },
  { key: "east_african", label: "East African", heritage: { level: "region", code: "east_african" } },
  { key: "caribbean", label: "Caribbean", heritage: { level: "region", code: "caribbean" } },
  { key: "christian", label: "Christian", faith: { level: "religion", code: "christian" } },
  { key: "islam", label: "Muslim", faith: { level: "religion", code: "islam" } },
];

/** Does a stored value sit under this option (Zambian under Southern African, Seventh-day Adventist under Christian)? */
function under(code: string | undefined, key: string, kind: "heritage" | "faith") {
  if (!code) return false;
  return (kind === "heritage" ? heritageLadder(code) : faithLadder(code)).some((n) => n.code === key);
}

/** The words for a row: your own pick when it sits under it, else the family. */
function ownLabel(o: Opt, code: string | undefined) {
  if (!code || !under(code, o.key, o.heritage ? "heritage" : "faith")) return o.label;
  return (o.heritage ? heritageNode(code)?.label : faithNode(code)?.label) ?? o.label;
}

export function CommunitySheet({ open, onClose }: SheetProps) {
  const repo = useRepo();
  // Only the signed-in person's own identity is read here (never a member view).
  const ident = useDb((db) => (db.me ? (db.identities[db.me] ?? null) : null));
  const h = ident?.heritage ?? null;
  const f = ident?.faith ?? null;

  async function pick(o: Opt) {
    const isH = !!o.heritage;
    const on = isH ? under(h?.code, o.key, "heritage") : under(f?.code, o.key, "faith");
    const r = on
      ? await repo.deleteIdentityField(isH ? "heritage" : "faith")
      : await repo.setIdentity({ heritage: isH ? o.heritage : h, faith: isH ? f : o.faith, consent: true });
    if (!r.ok) notify.error("Not saved. Try again.");
  }

  return (
    <ResponsiveSheet open={open} onOpenChange={(o) => !o && onClose()} title="Community pods" footer={done(onClose)}>
      <PageName>Your seat</PageName>
      <SheetLine className="-mt-s3 mb-s4">Only members see you there.</SheetLine>
      <Rows label="Community pods">
        {COMMUNITY.map((o) => {
          const on = o.heritage ? under(h?.code, o.key, "heritage") : under(f?.code, o.key, "faith");
          return <ChoiceRow key={o.key} on={on} hue="grove" label={ownLabel(o, o.heritage ? h?.code : f?.code)} onToggle={() => pick(o)} />;
        })}
      </Rows>
    </ResponsiveSheet>
  );
}

/* ── Texts (Y02): SMS off unless chosen (library C #7) ─────────────────────────────────────────────────────────── */

export function TextsSheet({ open, onClose }: SheetProps) {
  const repo = useRepo();
  const me = useMe();
  const { prefs, save } = useSeatPrefs();
  const sms = !!me?.notification_prefs.sms;

  async function toggle(key: (typeof TEXT_KINDS)[number]["key"]) {
    if (!me) return;
    const on = sms && prefs.texts[key];
    const texts = { ...prefs.texts, [key]: !on };
    if (!sms) for (const k of TEXT_KINDS) texts[k.key] = k.key === key;
    save({ ...prefs, texts });
    const want = TEXT_KINDS.some((k) => texts[k.key]);
    if (want !== sms) {
      const r = await repo.setNotificationPrefs({ ...me.notification_prefs, sms: want });
      if (!r.ok) notify.error("Not saved. Try again.");
    }
  }

  return (
    <ResponsiveSheet open={open} onOpenChange={(o) => !o && onClose()} title="Text me" footer={done(onClose)}>
      <PageName>Your seat</PageName>
      <Rows label="Text me">
        {TEXT_KINDS.map((k) => (
          <ChoiceRow key={k.key} on={sms && prefs.texts[k.key]} label={k.label} onToggle={() => toggle(k.key)} />
        ))}
      </Rows>
    </ResponsiveSheet>
  );
}

/* ── Claude plans (I #2, Apple 5.1.2(i)): one line, one ring ──────────────────────────────────────────────────── */

export function ClaudeSheet({ open, onClose }: SheetProps) {
  const { prefs, save } = useSeatPrefs();
  return (
    <ResponsiveSheet open={open} onOpenChange={(o) => !o && onClose()} title="Claude plans" footer={done(onClose)}>
      <PageName>Your seat</PageName>
      <SheetLine className="-mt-s3 mb-s4">Picks a time and place from free times.</SheetLine>
      <Rows label="Claude plans">
        <ChoiceRow safe on={prefs.claude} label={prefs.claude ? "On" : "Off"} onToggle={() => save({ ...prefs, claude: !prefs.claude })} />
      </Rows>
    </ResponsiveSheet>
  );
}

/* ── More (Y06), Help, Privacy, Blocked ────────────────────────────────────────────────────────────────────────── */

export function MoreSheet({ open, onClose, go, onSignOut }: SheetProps & { go: (s: SeatSheet) => void; onSignOut: () => void }) {
  return (
    <ResponsiveSheet open={open} onOpenChange={(o) => !o && onClose()} title="More">
      <PageName>Your seat</PageName>
      <Rows label="More">
        <SheetRow icon="help" label="Help" arrow onClick={() => go("help")} />
        <SheetRow icon="why" label="Privacy and terms" arrow onClick={() => go("privacy")} />
        <SheetRow icon="back" tone="quiet" label="Sign out" onClick={onSignOut} />
      </Rows>
      <Apart>
        <Rows>
          <SheetRow icon="block" tone="quiet" label="Delete my seat" onClick={() => go("delete")} />
        </Rows>
      </Apart>
    </ResponsiveSheet>
  );
}

export function HelpSheet({ open, onClose, go }: SheetProps & { go: (s: SeatSheet) => void }) {
  return (
    <ResponsiveSheet open={open} onOpenChange={(o) => !o && onClose()} title="If something’s off">
      <PageName>Your seat</PageName>
      <SafetyCenter onBlocked={() => go("blocked")} />
    </ResponsiveSheet>
  );
}

export function PrivacySheet({ open, onClose }: SheetProps) {
  return (
    <ResponsiveSheet open={open} onOpenChange={(o) => !o && onClose()} title="Privacy and terms">
      <PageName>Your seat</PageName>
      <PrivacyCenter />
    </ResponsiveSheet>
  );
}

export function BlockedSheet({ open, onClose }: SheetProps) {
  return (
    <ResponsiveSheet open={open} onOpenChange={(o) => !o && onClose()} title="Blocked">
      <PageName>Your seat</PageName>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={SNAPPY}>
        <BlockedList />
      </motion.div>
    </ResponsiveSheet>
  );
}
