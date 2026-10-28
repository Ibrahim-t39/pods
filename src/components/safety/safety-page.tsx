// /app/safety, "If something's off" (PLATFORM_SPEC §F9, V3_SPEC §6.5; never "Safety center" or "safe", library I #4).
// QA round 1: the emergency lines are one compact card of two large controls at the top (always one tap, never a
// plain row), then labelled groups, each one job (DESIGN §9: rows touch inside a group, s8 between):
//   card             Call 911 (the only red a member sees) · Call or text 988
//   During a hangout Share my plan (says why when it can't yet) · Check in (on the day) · the person you trust
//   People           Report someone (→ People, then Report or Block on the person) · Blocked (count or "No one")
//   More             Guidelines (/safety) · Write to us
// Every row shows its state on the right, so nothing is a bare arrow. Laptop: the object on the right is you and the
// person you trust, two beads meeting. Teal is trust here (COLOR_LIFE §6.2).
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Button, ResponsiveSheet, notify } from "@/components/ui";
import { Disc } from "@/components/brand/disc";
import { Stage } from "@/components/brand/stage";
import { GENTLE, STAGGER } from "@/components/brand/motion";
import { CondensingHead } from "@/components/shell/condensing-head";
import { useDb, useHydrated, useMe, useRepo } from "@/lib/db/hooks";
import { useClock } from "@/lib/time/clock";
import { formatTime, formatWhen } from "@/lib/time/format";
import { myPlans, planShareText, smsHref } from "@/lib/platform/selectors";
import { GoLink, GroupLabel, PageName, PillField, Rows, SheetFoot, SheetRow } from "@/components/profile/kit";
import { BlockedList, useBlockedPeople } from "./blocked-list";
import { EmergencyCard, WRITE_TO_US } from "./help-lines";
import "@/components/profile/seat.css";

const DAY = 86_400_000;

export function SafetyPage() {
  const hydrated = useHydrated();
  const me = useMe();
  const now = useClock().getTime();
  const contact = useDb((db) => (db.me ? (db.trustedContacts?.[db.me] ?? null) : null));
  const plans = useDb((db) => myPlans(db, now));
  const blocked = useBlockedPeople().length;
  const [sheet, setSheet] = useState<"contact" | "blocked" | null>(null);
  const router = useRouter();
  useEffect(() => {
    if (hydrated && !me) router.replace("/app");
  }, [hydrated, me, router]);

  // the next locked hangout I'm going to (share it); a hangout today or just ended that I haven't checked in to
  const next = useMemo(() => plans.upcoming.find((p) => p.locked && p.me === "going") ?? null, [plans]);
  const checkIn = useMemo(() => {
    const all = [...plans.upcoming, ...plans.past];
    return (
      all.find((p) => p.locked && p.me === "going" && !p.checkedIn && Date.parse(p.starts_at) - now < DAY / 4 && now - Date.parse(p.ends_at) < 2 * DAY) ?? null
    );
  }, [plans, now]);

  if (!hydrated || !me) return null;

  const shareText = next ? planShareText({ title: next.title, venue: next.venue }, formatWhen(next.starts_at), formatTime(next.ends_at)) : null;

  async function shareWithoutContact() {
    if (!shareText) return;
    try {
      if (navigator.share) await navigator.share({ text: shareText });
      else {
        await navigator.clipboard.writeText(shareText);
        notify("Copied. Send it to someone you trust.");
      }
    } catch {
      /* dismissed */
    }
  }

  const groups = [
    <EmergencyCard key="now" />,
    <div key="during">
      <GroupLabel>During a hangout</GroupLabel>
      <Rows label="During a hangout">
        {shareText && contact ? (
          <SheetRow icon="send" label="Share my plan" value={<span data-nc>{contact.name}</span>} href={smsHref(contact.phone, shareText)} external />
        ) : shareText ? (
          <SheetRow icon="send" label="Share my plan" value="Send" onClick={shareWithoutContact} />
        ) : (
          <SheetRow icon="send" label="Share my plan" value="After a plan locks" disabled />
        )}
        {checkIn && <SheetRow icon="here" label="Check in" value="Today" href={`/app/plans/${checkIn.id}`} arrow />}
        <SheetRow
          icon={contact ? "person" : "add"}
          label="Someone you trust"
          value={contact ? <span data-nc>{contact.name}</span> : "No one added yet"}
          arrow
          onClick={() => setSheet("contact")}
        />
      </Rows>
    </div>,
    <div key="people">
      <GroupLabel>People</GroupLabel>
      <Rows label="People">
        <SheetRow icon="flag" label="Report someone" href="/app/people" arrow />
        <SheetRow icon="block" label="Blocked" value={<span data-nc className="tabular-nums">{blocked ? blocked : "No one"}</span>} arrow onClick={() => setSheet("blocked")} />
      </Rows>
    </div>,
    <div key="more">
      <GroupLabel>More</GroupLabel>
      <Rows label="More">
        <SheetRow icon="why" label="Guidelines" href="/safety" arrow />
        <SheetRow icon="talk" label="Write to us" href={WRITE_TO_US} external />
      </Rows>
    </div>,
  ];

  return (
    <div className="seat-pg">
      <Stage light="paper" />
      <CondensingHead left="mark" size="md" title="If something’s off." compact="If something’s off" className="seat-head" />
      <div className="seat-body">
        <div className="seat-col safe-col">
          {groups.map((g, i) => (
            <motion.div key={i} className={i > 0 ? "settle" : undefined} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...GENTLE, delay: 0.06 + i * STAGGER }}>
              {g}
            </motion.div>
          ))}
        </div>
        <TrustObject name={contact?.name ?? null} meInitial={me.first_name.slice(0, 1)} onAdd={() => setSheet("contact")} />
      </div>

      <ContactSheet open={sheet === "contact"} onClose={() => setSheet(null)} />
      <ResponsiveSheet open={sheet === "blocked"} onOpenChange={(o) => !o && setSheet(null)} title="Blocked">
        <PageName>If something’s off</PageName>
        <BlockedList />
      </ResponsiveSheet>
    </div>
  );
}

/** Laptop only: you and the person you trust, two beads meeting. Empty: their seat is a dashed ring you can fill. */
function TrustObject({ name, meInitial, onAdd }: { name: string | null; meInitial: string; onAdd: () => void }) {
  return (
    <div className="safe-obj" aria-hidden={name ? true : undefined}>
      <motion.div className="safe-pair" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={GENTLE}>
        <Disc tone="you" initial={meInitial} size={176} />
        {name ? (
          <motion.span key={name} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={GENTLE} className="-ml-12">
            <Disc tone="grove" seed={name} initial={name.slice(0, 1)} size={176} />
          </motion.span>
        ) : (
          <button type="button" onClick={onAdd} aria-label="Add someone you trust" className="pressable -ml-12 rounded-full outline-offset-4">
            <Disc tone="open" size={176} />
          </button>
        )}
      </motion.div>
    </div>
  );
}

/** "(256) 555-0142" for US numbers, else the digits as saved. Display only. */
function prettyPhone(p: string) {
  const d = p.replace(/\D/g, "");
  const us = d.length === 11 && d.startsWith("1") ? d.slice(1) : d.length === 10 ? d : null;
  return us ? `(${us.slice(0, 3)}) ${us.slice(3, 6)}-${us.slice(6)}` : p;
}

/** Add, change or remove the person you trust. Device-local; only ever used to text them your own plan. */
function ContactSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const repo = useRepo();
  const contact = useDb((db) => (db.me ? (db.trustedContacts?.[db.me] ?? null) : null));
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<{ field: "name" | "phone"; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // each time the sheet opens it starts from what is saved
  useEffect(() => {
    if (!open) return;
    setName(contact?.name ?? "");
    setPhone(contact ? prettyPhone(contact.phone) : "");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function save() {
    if (!name.trim()) return setError({ field: "name", msg: "Add a name." });
    setBusy(true);
    const r = await repo.setTrustedContact({ name: name.trim(), phone });
    setBusy(false);
    if (!r.ok) {
      const field = r.error.code === "VALIDATION" && "field" in r.error && r.error.field === "phone" ? "phone" : "name";
      return setError({ field, msg: r.error.code === "VALIDATION" ? (r.error.message ?? "Check this.") : "Not saved. Try again." });
    }
    onClose();
    notify(`${name.trim()} saved`);
  }

  async function remove() {
    const before = contact;
    const r = await repo.setTrustedContact(null);
    onClose();
    if (r.ok && before) notify(`${before.name} removed`, { undo: () => void repo.setTrustedContact({ name: before.name, phone: before.phone }) });
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={contact ? "Someone you trust" : "Add someone you trust"}
      dismissible={!busy}
      footer={
        <SheetFoot
          left={contact ? <GoLink onClick={remove}>Remove</GoLink> : <GoLink onClick={onClose}>Cancel</GoLink>}
          right={
            <Button loading={busy} onClick={save}>
              Save
            </Button>
          }
        />
      }
    >
      <PageName>If something’s off</PageName>
      <div className="flex flex-col gap-s4">
        <PillField label="Name" value={name} onChange={(v) => { setName(v); setError(null); }} maxLength={40} autoComplete="off" error={error?.field === "name" ? error.msg : null} />
        <PillField label="Phone" value={phone} onChange={(v) => { setPhone(v); setError(null); }} inputMode="tel" autoComplete="off" maxLength={20} error={error?.field === "phone" ? error.msg : null} />
      </div>
    </ResponsiveSheet>
  );
}
