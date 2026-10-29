// The sheets behind Your seat (wireframes Y02, Y03, Y06, B03s; V3_SPEC §6.5). Each sentence on Your seat opens one.
// One sheet at a time: opening one from another replaces it (DESIGN.md §10). Every sheet holds 15 words or fewer
// (a list sheet 24), at most one filled primary, choices as ring rows (never switches; J #7).
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Button, ResponsiveSheet, notify } from "@/components/ui";
import { Disc } from "@/components/brand/disc";
import { Icon } from "@/components/icons";
import { CirclesLoader } from "@/components/brand/circles-loader";
import { NewPodCard } from "@/components/placement/new-pod";
import { SNAPPY } from "@/components/brand/table-ring";
import { useDb, useMe, useRepo } from "@/lib/db/hooks";
import { faithLabel, faithValue, heritageLabel, heritageValue } from "@/components/onboarding/community";
import { CommunityFields } from "@/components/onboarding/community-fields";
import { normalizeSlots, type Rhythm, type Slot } from "@/lib/types";
import { WeekGrid } from "@/components/availability/week-grid";
import { RhythmChoice } from "@/components/availability/rhythm-choice";
import { BlockedList, PrivacyCenter } from "@/components/safety";
import { PageName, ChoiceRow, Rows, SheetFoot, SheetLine, GoLink } from "./kit";
import "./you.css";
import { useSeatPrefs } from "./local-prefs";
import { REMINDER_KINDS, shortLike, type ReminderKind } from "./words";

export type SeatSheet = "likes" | "free" | "community" | "reminders" | "ai" | "more" | "privacy" | "blocked" | "delete";
export const SEAT_SHEETS: SeatSheet[] = ["likes", "free", "community", "reminders", "ai", "more", "privacy", "blocked", "delete"];

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
      <PageName>You</PageName>
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
  const [showAll, setShowAll] = useState(false);
  const userInterests = useDb((db) => db.userInterests);
  const popular = useMemo(() => {
    const n: Record<string, number> = {};
    for (const u of userInterests) n[u.interest_id] = (n[u.interest_id] ?? 0) + 1;
    return n;
  }, [userInterests]);
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

  // yours first, then the likes most people near you share (the ones most likely to have a pod); six until "More"
  const ordered = [...all.filter((i) => mine.includes(i.id)), ...all.filter((i) => !mine.includes(i.id)).sort((a, b) => (popular[b.id] ?? 0) - (popular[a.id] ?? 0))];
  const cap = Math.max(6, mine.length + 2);
  const shown = showAll ? ordered : ordered.slice(0, cap);
  return (
    <>
      <SheetLine className="-mt-s3 mb-s4">{full ? `Up to ${max}. Remove one to add another.` : "Tap to add. Each one looks for a pod near you."}</SheetLine>
      <motion.div layout className="yo-chips" role="group" aria-label="You’re into">
        {shown.map((i) => {
          const on = mine.includes(i.id);
          const word = shortLike(i.id, i.label);
          const label = word.charAt(0).toUpperCase() + word.slice(1);
          return (
            <motion.span key={i.id} layout="position" transition={SNAPPY}>
              <button
                type="button"
                aria-pressed={on}
                className="yo-chip yo-chip-pick pressable"
                data-on={on || undefined}
                disabled={busy === i.id || (on && mine.length === 1) || (!on && full)}
                onClick={() => toggle(i.id, !on, word)}
              >
                {on && <Icon name="tick" size={16} stroke={2.2} />}
                {label}
              </button>
            </motion.span>
          );
        })}
        {ordered.length > cap && (
          <button type="button" className="yo-chip yo-chip-add pressable" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Fewer" : `More · ${ordered.length - cap}`}
          </button>
        )}
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

/* ── Free: the same week grid as sign-up ──────────────────────────────────────────────────────────────────────── */

/** The week grid + rhythm, wired to the repo. Each change saves the whole week (so a drag ends on the last stroke),
 *  and drops "keep this day free" days the new times no longer touch. Placement and planning read it as before. */
export function FreeEditor() {
  const repo = useRepo();
  const me = useMe();
  const [slots, setSlots] = useState<Slot[]>(() => normalizeSlots(me?.availability));
  const [rhythm, setRhythm] = useState<Rhythm>(me?.rhythm ?? "steady");
  if (!me) return null;
  const save = async (next: Slot[], r: Rhythm) => {
    const days = me.blocked_days.filter((d) => next.some((x) => x.startsWith(d)));
    const res = await repo.setAvailability(next, days, r);
    if (!res.ok) notify.error("Not saved. Try again.");
  };
  return (
    <div className="flex w-full flex-col items-center gap-s5">
      <WeekGrid
        slots={slots}
        onChange={(next) => {
          setSlots(next);
          void save(next, rhythm);
        }}
      />
      <RhythmChoice
        value={rhythm}
        onChange={(r) => {
          setRhythm(r);
          void save(slots, r);
        }}
      />
    </div>
  );
}

export function FreeSheet({ open, onClose }: SheetProps) {
  return (
    <ResponsiveSheet open={open} onOpenChange={(o) => !o && onClose()} title="When you’re free" footer={done(onClose)}>
      <PageName>You</PageName>
      <SheetLine className="-mt-s3 mb-s6">The AI plans hangouts inside these times.</SheetLine>
      {open && <FreeEditor />}
    </ResponsiveSheet>
  );
}

/* ── Community pods (B03s): opt-in, members only, never shown to anyone else ──────────────────────────────────── */

export function CommunitySheet({ open, onClose }: SheetProps) {
  const [asking, setAsking] = useState(false);
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Community pods"
      footer={<SheetFoot right={<Button variant={asking ? "secondary" : "primary"} onClick={onClose}>Done</Button>} />}
    >
      <PageName>You</PageName>
      <SheetLine className="-mt-s3 mb-s4">Only members see you there. Change it anytime.</SheetLine>
      <CommunityPicker onAsking={setAsking} />
    </ResponsiveSheet>
  );
}

/** The two-field community picker (same as first run); adding one proposes its pod inline. Shared by the sheet and the edit page. */
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

  // Each tap saves (Edit profile has no Done for this card). Clearing a field removes only that field.
  async function save(kind: "heritage" | "faith", code: string | null) {
    const before = known;
    const r = code
      ? await repo.setIdentity({ heritage: kind === "heritage" ? heritageValue(code) : h, faith: kind === "faith" ? faithValue(code) : f, consent: true })
      : await repo.deleteIdentityField(kind);
    if (!r.ok) notify.error("Not saved. Try again.");
    else setAsked(code ? { kind, before } : null);
  }

  return (
    <>
      <CommunityFields heritage={h?.code ?? null} faith={f?.code ?? null} onHeritage={(c) => save("heritage", c)} onFaith={(c) => save("faith", c)} />
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
  if (ident?.heritage?.code) out.push(heritageLabel(ident.heritage.code) ?? ident.heritage.code);
  if (ident?.faith?.code) out.push(faithLabel(ident.faith.code) ?? ident.faith.code);
  return out;
}

/* ── Reminders (Y02): in-app only, independent toggles ───────────────────────────────────────────────────────────── */

/** Reminders: independent toggles, any number on. They show in the app; no copy claims a text is sent. */
export function RemindersSheet({ open, onClose }: SheetProps) {
  const { prefs, save } = useSeatPrefs();
  const toggle = (key: ReminderKind) => save({ ...prefs, reminders: { ...prefs.reminders, [key]: !prefs.reminders[key] } });
  return (
    <ResponsiveSheet open={open} onOpenChange={(o) => !o && onClose()} title="Reminders" footer={done(onClose)}>
      <PageName>You</PageName>
      <SheetLine className="-mt-s3 mb-s4">In the app. Turn on as many as you like.</SheetLine>
      <Rows label="Reminders">
        {REMINDER_KINDS.map((k) => (
          <ChoiceRow
            key={k.key}
            on={prefs.reminders[k.key]}
            label={
              <>
                <span className="block">{k.label}</span>
                {k.key === "on" && <span className="block text-[13px] text-ink-2">2 hours before</span>}
              </>
            }
            onToggle={() => toggle(k.key)}
          />
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
      <PageName>You</PageName>
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
