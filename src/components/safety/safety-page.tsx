// /app/safety, "If something's off" (PLATFORM_SPEC §F9, V3_SPEC §6.5; never "Safety center"). Redesign r2 (Grab safety
// tools, Cash App account safety): emergency first, then the tools tied to your real next hangout, then people, then
// the guidelines inline (not a bare link).
//   left    emergency (Call 911, the only red · Call or text 988) · your next hangout (share it, check in) · someone you trust
//   right   people (report, blocked) · the guidelines in four lines · write to us
// Teal is trust here (COLOR_LIFE §6.2).
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Button, ResponsiveSheet, notify } from "@/components/ui";
import { Disc } from "@/components/brand/disc";
import { GENTLE, STAGGER } from "@/components/brand/motion";
import { Icon } from "@/components/icons";
import { useDb, useHydrated, useMe, useRepo } from "@/lib/db/hooks";
import { useClock } from "@/lib/time/clock";
import { formatTime, formatWhen } from "@/lib/time/format";
import { myPlans, planShareText, smsHref } from "@/lib/platform/selectors";
import { GoLink, PageName, PillField, SheetFoot } from "@/components/profile/kit";
import { Card, Row, Section, TextAction, YouHead, YouPage } from "@/components/profile/you-kit";
import { BlockedList, useBlockedPeople } from "./blocked-list";
import { CONTACT } from "@/components/legal/contact";

const DAY = 86_400_000;

const GUIDES = [
  { icon: "place", text: "Every hangout is at a public place." },
  { icon: "room", text: "Meet as a group. Skip one-on-one until you’re ready." },
  { icon: "exit", text: "Leave anytime. No one needs a reason." },
  { icon: "flag", text: "Report anything that feels off, right from their profile." },
] as const;

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
  const soon = useMemo(() => next ?? plans.upcoming.find((p) => p.me === "going") ?? plans.upcoming[0] ?? null, [plans, next]);
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
  const fade = (i: number) => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { ...GENTLE, delay: 0.04 + i * STAGGER } });

  return (
    <YouPage>
      <YouHead title="If something’s off" sub="If you’re in danger, call 911 first. Pods can’t send help." />
      <div className="yo-wrap yo-body">
        <div className="yo-cols" data-even>
          <div>
            <motion.div {...fade(0)}>
              <Section label="Right now">
                <div className="yo-sos" role="group" aria-label="Emergency">
                  <a href="tel:911" className="pressable" data-tone="red">
                    <Icon name="help" size={22} />
                    Call 911
                  </a>
                  <a href="tel:988" className="pressable">
                    <Icon name="talk" size={22} />
                    Call or text 988
                  </a>
                </div>
              </Section>
            </motion.div>

            <motion.div {...fade(1)}>
              <Section label="Your next hangout" className="mt-s6">
                <Card tone="safe">
                  {soon ? (
                    <>
                      <div className="yo-pad">
                        <p className="text-[13px] font-medium text-ink-2" data-nc>
                          {soon.podName} · {soon.locked ? "Locked" : `${soon.going} going`}
                        </p>
                        <p className="mt-s1 text-[18px] font-semibold tracking-[-0.01em]" data-nc>
                          {soon.title}
                        </p>
                        <p className="mt-s1 text-[15px] text-ink-2" data-nc>
                          {formatWhen(soon.starts_at)}
                          {soon.venue ? ` · ${soon.venue.name}` : ""}
                        </p>
                        <div className="mt-s4 flex flex-wrap gap-s2">
                          {shareText && contact ? (
                            <Button asChild size="sm" leadingIcon={<Icon name="send" size={16} />}>
                              <a href={smsHref(contact.phone, shareText)} data-nc>
                                Send to {contact.name}
                              </a>
                            </Button>
                          ) : shareText ? (
                            <Button size="sm" onClick={shareWithoutContact} leadingIcon={<Icon name="send" size={16} />}>
                              Share my plan
                            </Button>
                          ) : (
                            <>
                              <Button asChild size="sm" variant="secondary">
                                <a href="/app/plans">Open plans</a>
                              </Button>
                              <p className="w-full text-[14px] text-ink-2">You can share it once it locks.</p>
                            </>
                          )}
                          {checkIn && (
                            <Button asChild size="sm" variant="secondary" leadingIcon={<Icon name="here" size={16} />}>
                              <a href={`/app/plans/${checkIn.id}`}>Check in</a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="yo-pad text-[15px] text-ink-2">When a plan locks, you can send it to someone you trust in one tap.</p>
                  )}
                </Card>
              </Section>
            </motion.div>

            <motion.div {...fade(2)}>
              <Section label="Someone you trust" action={contact ? <TextAction onClick={() => setSheet("contact")}>Edit</TextAction> : undefined} className="mt-s6">
                <Card>
                  {contact ? (
                    <Row
                      lead={<Disc tone="grove" seed={contact.name} initial={contact.name.slice(0, 1)} size={40} />}
                      label={<span data-nc>{contact.name}</span>}
                      hint={<span data-nc>{prettyPhone(contact.phone)} · gets your plan when you share it</span>}
                      onClick={() => setSheet("contact")}
                      arrow
                    />
                  ) : (
                    <div className="yo-pad flex items-center justify-between gap-s4">
                      <p className="text-[15px] text-ink-2">A friend or family member who gets your plan in one tap.</p>
                      <Button size="sm" variant="secondary" onClick={() => setSheet("contact")} leadingIcon={<Icon name="add" size={16} />}>
                        Add
                      </Button>
                    </div>
                  )}
                </Card>
              </Section>
            </motion.div>
          </div>

          <div>
            <motion.div {...fade(3)}>
              <Section label="People">
                <Card>
                  <Row icon="flag" tone="safe" label="Report someone" hint="Open their profile, then Report or Block" href="/app/people" arrow />
                  <Row icon="blocked" tone="safe" label="Blocked" value={<span className="tabular-nums">{blocked ? blocked : "No one"}</span>} arrow onClick={() => setSheet("blocked")} />
                </Card>
              </Section>
            </motion.div>
            <motion.div {...fade(4)}>
              <Section label="How Pods stays safe" className="mt-s6">
                <Card>
                  <ul className="yo-list">
                    {GUIDES.map((g) => (
                      <li key={g.text}>
                        <Icon name={g.icon} size={18} />
                        {g.text}
                      </li>
                    ))}
                  </ul>
                  <Row icon="list" label="Read the guidelines" href="/safety" arrow />
                  {CONTACT.ready && <Row icon="mail" label={CONTACT.label} href={CONTACT.href} external={CONTACT.external} arrow />}
                </Card>
              </Section>
            </motion.div>
          </div>
        </div>
      </div>

      <ContactSheet open={sheet === "contact"} onClose={() => setSheet(null)} />
      <ResponsiveSheet open={sheet === "blocked"} onOpenChange={(o) => !o && setSheet(null)} title="Blocked">
        <PageName>If something’s off</PageName>
        <BlockedList />
      </ResponsiveSheet>
    </YouPage>
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
