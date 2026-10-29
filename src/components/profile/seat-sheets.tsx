// The sheets behind Your seat (wireframes Y02, Y03, Y06, B03s; V3_SPEC §6.5). Each sentence on Your seat opens one.
// One sheet at a time: opening one from another replaces it (DESIGN.md §10). Every sheet holds 15 words or fewer
// (a list sheet 24), at most one filled primary, choices as ring rows (never switches; J #7).
"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Button, Chip, ResponsiveSheet, notify } from "@/components/ui";
import { Disc } from "@/components/brand/disc";
import { CirclesLoader } from "@/components/brand/circles-loader";
import { NewPodCard } from "@/components/placement/new-pod";
import { SNAPPY } from "@/components/brand/table-ring";
import { useDb, useMe, useRepo } from "@/lib/db/hooks";
import { faithLadder, faithNode, heritageLadder, heritageNode } from "@/data/taxonomy";
import type { FaithValue, HeritageValue, Slot } from "@/lib/types";
import { BlockedList, PrivacyCenter } from "@/components/safety";
import { PageName, ChoiceRow, Rows, SheetFoot, SheetLine, GoLink } from "./kit";
import "./you.css";
import { useSeatPrefs } from "./local-prefs";
import { TEXT_KINDS, shortLike } from "./words";

export type SeatSheet = "likes" | "free" | "community" | "texts" | "ai" | "more" | "privacy" | "blocked" | "delete";
export const SEAT_SHEETS: SeatSheet[] = ["likes", "free", "community", "texts", "ai", "more", "privacy", "blocked", "delete"];

type SheetProps = { open: boolean; onClose: () => void };
const done = (onClose: () => void) => <SheetFoot right={<Button onClick={onClose}>Done</Button>} />;

/* ── Likes (from "Into basketball, guitar.") ─────────────────────────────────────────────────────────────────────────── */

export function LikesSheet({ open, onClose }: SheetProps) {
  const repo = useRepo();
  const me = useMe();
  const file = useRef<HTMLInputElement>(null);
  const [asking, setAsking] = useState(false);
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
    <ResponsiveSheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="You’re into"
      // one filled primary per sheet: while a new pod asks Join, Done steps back to the quiet pill
      footer={<SheetFoot right={<Button variant={asking ? "secondary" : "primary"} onClick={onClose}>Done</Button>} />}
    >
      <PageName>Your seat</PageName>
      <LikesPicker onAsking={setAsking} />
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

/** The likes chips with continuous placement: adding one looks for its pod and offers it inline. Shared by the sheet
 *  and /app/profile/edit. `onAsking` reports when a new pod is waiting on Join (so the host can quiet its own primary). */
export function LikesPicker({ onAsking }: { onAsking?: (asking: boolean) => void }) {
  const repo = useRepo();
  const all = useDb((db) => Object.values(db.interests).filter((i) => i.active));
  const mine = useDb((db) => db.userInterests.filter((u) => u.user_id === db.me).map((u) => u.interest_id));
  const max = useDb((db) => db.config.placement.maxInterestPods);
  const [busy, setBusy] = useState<string | null>(null);
  // The last like you added and what placement found for it (continuous placement: likes are never final).
  const [found, setFound] = useState<{ id: string; word: string; state: "looking" | "match" | "none" } | null>(null);
  const match = useDb((db) => (found?.state === "match" ? ((db.podMatches ?? []).find((m) => m.user_id === db.me && m.kind === "interest" && m.topic_key === found.id) ?? null) : null));
  const full = mine.length >= max;
  const asking = !!(match && match.status === "new");
  useEffect(() => onAsking?.(asking), [asking, onAsking]);

  async function toggle(id: string, on: boolean, word: string) {
    if (on && full) return;
    setBusy(id);
    if (on) setFound({ id, word, state: "looking" });
    const r = on ? await repo.addInterest(id) : await repo.removeInterest(id);
    setBusy(null);
    if (!r.ok) {
      notify.error("Not saved. Try again.");
      setFound(null);
      return;
    }
    if (on) {
      const run = r.data as { results?: { candidate: { topic_key: string } }[] } | undefined;
      setFound({ id, word, state: run?.results?.some((x) => x.candidate.topic_key === id) ? "match" : "none" });
    } else if (found?.id === id) setFound(null);
  }

  // yours first, then the rest: what you hold reads as one group, what you can add as another (Meetup, Bumble)
  const ordered = [...all.filter((i) => mine.includes(i.id)), ...all.filter((i) => !mine.includes(i.id))];
  return (
    <>
      <SheetLine className="-mt-s3 mb-s6">{full ? `Up to ${max}. Remove one to add another.` : "Add more anytime. New pods find you."}</SheetLine>
      <motion.div layout className="flex flex-wrap gap-s2" role="group" aria-label="You’re into">
        {ordered.map((i) => {
          const on = mine.includes(i.id);
          const word = shortLike(i.id, i.label);
          const label = word.charAt(0).toUpperCase() + word.slice(1);
          return (
            <motion.span key={i.id} layout="position" transition={SNAPPY}>
              <Chip
                size="sm"
                selected={on}
                aria-label={label}
                className={on ? "border-select bg-select text-on-select" : "hover:border-select"}
                disabled={busy === i.id || (on && mine.length === 1) || (!on && full)}
                onSelectedChange={(v) => toggle(i.id, v, word)}
              >
                {label}
              </Chip>
            </motion.span>
          );
        })}
      </motion.div>
      <div aria-live="polite" className="mt-s6 empty:hidden">
        {found?.state === "looking" && (
          <p className="flex min-h-14 items-center gap-s3 text-label text-ink-2">
            <CirclesLoader size={28} label="Looking" /> Looking for a {found.word} pod
          </p>
        )}
        {found?.state === "match" && match && <NewPodCard match={match} variant="inline" onSkipped={() => setFound(null)} />}
        {found?.state === "none" && (
          <p className="min-h-14 text-label text-ink-2">No {found.word} pod nearby yet. We’ll keep looking.</p>
        )}
      </div>
    </>
  );
}

/* ── Free (from "Free weekends, afternoons.") ──────────────────────────────────────────────────────────────────── */

const PARTS = [
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
] as const;
const DAYS = [
  { key: "saturday", label: "Sat", full: "Saturday" },
  { key: "sunday", label: "Sun", full: "Sunday" },
] as const;

/** Free times as a grid: days down, parts of the day across; a filled cell is a time you are free. Read-only when
 *  `onToggle` is absent (the profile shows it), a control otherwise (the sheet and /app/profile/edit). */
export function FreeGrid({ slots, onToggle }: { slots: Slot[]; onToggle?: (s: Slot) => void }) {
  const cell = (s: Slot | null, label: string) => {
    if (!s) return <span key={label} className="yo-free-cell" data-na aria-hidden />;
    const on = slots.includes(s);
    if (!onToggle) return <span key={s} className="yo-free-cell" data-on={on || undefined} role="img" aria-label={`${label}: ${on ? "free" : "busy"}`} />;
    return <button key={s} type="button" role="checkbox" aria-checked={on} aria-label={label} onClick={() => onToggle(s)} className="yo-free-cell pressable" data-on={on || undefined} />;
  };
  return (
    <div className="yo-free">
      <span />
      {PARTS.map((p) => (
        <span key={p.key} className="text-center">
          {p.label}
        </span>
      ))}
      {DAYS.map((d) => (
        <FreeRow key={d.key} label={d.full}>
          {PARTS.map((p) => cell(`${d.key}-${p.key}` as Slot, `${d.full} ${p.label.toLowerCase()}`))}
        </FreeRow>
      ))}
      <FreeRow label="Weeknights">
        {cell(null, "wk-m")}
        {cell(null, "wk-a")}
        {cell("weekday-evening", "Weeknight evenings")}
      </FreeRow>
    </div>
  );
}

/** Saves a toggled slot (and drops blocked days the new free times no longer touch). */
export function useToggleSlot() {
  const repo = useRepo();
  const me = useMe();
  return async (s: Slot) => {
    if (!me) return;
    const slots = me.availability;
    const next = slots.includes(s) ? slots.filter((x) => x !== s) : [...slots, s];
    const days = me.blocked_days.filter((d) => !next.some((x) => x.startsWith(d)));
    const r = await repo.setAvailability(next, days);
    if (!r.ok) notify.error("Not saved. Try again.");
  };
}

export function FreeSheet({ open, onClose }: SheetProps) {
  const me = useMe();
  const toggle = useToggleSlot();
  return (
    <ResponsiveSheet open={open} onOpenChange={(o) => !o && onClose()} title="When you’re free" footer={done(onClose)}>
      <PageName>Your seat</PageName>
      <SheetLine className="-mt-s3 mb-s6">The AI plans hangouts inside these times.</SheetLine>
      <FreeGrid slots={me?.availability ?? []} onToggle={toggle} />
    </ResponsiveSheet>
  );
}

function FreeRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <span className="yo-free-day">{label}</span>
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
  const [asking, setAsking] = useState(false);
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Community pods"
      footer={<SheetFoot right={<Button variant={asking ? "secondary" : "primary"} onClick={onClose}>Done</Button>} />}
    >
      <PageName>Your seat</PageName>
      <SheetLine className="-mt-s3 mb-s4">Only members see you there. Change it anytime.</SheetLine>
      <CommunityPicker onAsking={setAsking} />
    </ResponsiveSheet>
  );
}

/** Community pod families as ring rows; adding one proposes its pod inline. Shared by the sheet and the edit page. */
export function CommunityPicker({ onAsking }: { onAsking?: (asking: boolean) => void }) {
  const repo = useRepo();
  // Only the signed-in person's own identity is read here (never a member view).
  const ident = useDb((db) => (db.me ? (db.identities[db.me] ?? null) : null));
  const h = ident?.heritage ?? null;
  const f = ident?.faith ?? null;

  // a community added here proposes its pod (continuous placement); the newest open one shows under the rows
  const [asked, setAsked] = useState<{ kind: "heritage" | "faith"; before: string[] } | null>(null);
  const known = useDb((db) => (db.podMatches ?? []).map((m) => m.id));
  const match = useDb((db) =>
    asked ? ((db.podMatches ?? []).filter((m) => !asked.before.includes(m.id) && m.user_id === db.me && m.kind === asked.kind && m.status !== "skipped").at(-1) ?? null) : null,
  );
  const asking = !!(match && match.status === "new");
  useEffect(() => onAsking?.(asking), [asking, onAsking]);

  async function pick(o: Opt) {
    const before = known;
    const isH = !!o.heritage;
    const on = isH ? under(h?.code, o.key, "heritage") : under(f?.code, o.key, "faith");
    const r = on
      ? await repo.deleteIdentityField(isH ? "heritage" : "faith")
      : await repo.setIdentity({ heritage: isH ? o.heritage : h, faith: isH ? f : o.faith, consent: true });
    if (!r.ok) notify.error("Not saved. Try again.");
    else setAsked(on ? null : { kind: isH ? "heritage" : "faith", before });
  }

  return (
    <>
      <Rows label="Community pods">
        {COMMUNITY.map((o) => {
          const on = o.heritage ? under(h?.code, o.key, "heritage") : under(f?.code, o.key, "faith");
          return <ChoiceRow key={o.key} on={on} hue="grove" label={ownLabel(o, o.heritage ? h?.code : f?.code)} onToggle={() => pick(o)} />;
        })}
      </Rows>
      {match && (
        <div aria-live="polite" className="mt-s6">
          <NewPodCard key={match.id} match={match} variant="inline" onSkipped={() => setAsked(null)} />
        </div>
      )}
    </>
  );
}

/** The communities you hold, in your own words ("Zambian", "Seventh-day Adventist"). Own identity only. */
export function useMyCommunities(): string[] {
  const ident = useDb((db) => (db.me ? (db.identities[db.me] ?? null) : null));
  const out: string[] = [];
  if (ident?.heritage?.code) out.push(heritageNode(ident.heritage.code)?.label ?? ident.heritage.code);
  if (ident?.faith?.code) out.push(faithNode(ident.faith.code)?.label ?? ident.faith.code);
  return out;
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

/* ── AI plans (I #2, Apple 5.1.2(i)): one line, one ring. Users see "AI"; the privacy page names the model. ───── */

export function AiSheet({ open, onClose }: SheetProps) {
  const { prefs, save } = useSeatPrefs();
  return (
    <ResponsiveSheet open={open} onOpenChange={(o) => !o && onClose()} title="AI plans" footer={done(onClose)}>
      <PageName>Your seat</PageName>
      <SheetLine className="-mt-s3 mb-s4">Picks a time and place from free times.</SheetLine>
      <Rows label="AI plans">
        <ChoiceRow safe on={prefs.claude} label={prefs.claude ? "On" : "Off"} onToggle={() => save({ ...prefs, claude: !prefs.claude })} />
      </Rows>
    </ResponsiveSheet>
  );
}

/* ── Privacy, Blocked (opened from /app/settings). Help is its own page (/app/safety, "If something's off"). ─────── */

export function PrivacySheet({ open, onClose }: SheetProps) {
  return (
    <ResponsiveSheet open={open} onOpenChange={(o) => !o && onClose()} title="Privacy and terms">
      <PageName>Settings</PageName>
      <PrivacyCenter />
    </ResponsiveSheet>
  );
}

export function BlockedSheet({ open, onClose }: SheetProps) {
  return (
    <ResponsiveSheet open={open} onOpenChange={(o) => !o && onClose()} title="Blocked">
      <PageName>Settings</PageName>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={SNAPPY}>
        <BlockedList />
      </motion.div>
    </ResponsiveSheet>
  );
}
