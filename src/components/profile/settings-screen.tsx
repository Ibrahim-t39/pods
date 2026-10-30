// /app/settings (redesign r2; PLATFORM_SPEC §F10): one clean grouped list, inset-grouped cards (Delphi / iOS).
//   Account          you (photo, name, phone) → Edit profile
//   Mode             Live / Demo as two radio cards, right here (easy to find; data-allow-mode)
//   Notifications    Reminders · AI plans (sheets shared with the profile)
//   Privacy, safety  Privacy and terms · Blocked · If something's off
//   Help             Guidelines · Write to us
//   Sign out, then Delete my seat (its own confirm flow)
// phone: one stack. laptop: two even columns (account + mode + notifications | privacy + help + leave).
"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Disc } from "@/components/brand/disc";
import { GENTLE, STAGGER } from "@/components/brand/motion";
import { notify } from "@/components/ui";
import { useHydrated, useMe } from "@/lib/db/hooks";
import { SIGNED_OUT_HREF, signOut } from "@/lib/safety/sign-out";
import { displayName } from "@/lib/utils";
import { DeleteAccountFlow, useBlockedPeople } from "@/components/safety";
import { CONTACT } from "@/components/legal/contact";
import { useSeatPrefs } from "./local-prefs";
import { remindersHint, remindersValue } from "./words";
import { AiSheet, BlockedSheet, PrivacySheet, RemindersSheet } from "./seat-sheets";
import { ModePicker } from "./mode-screen";
import { Card, Row, Section, YouHead, YouPage } from "./you-kit";

type SettingsSheet = "reminders" | "ai" | "privacy" | "blocked" | "delete";
const SHEETS: SettingsSheet[] = ["reminders", "ai", "privacy", "blocked", "delete"];

/** "(206) 555-0142" for US numbers, else as saved. */
function prettyPhone(p: string) {
  const d = p.replace(/\D/g, "");
  const us = d.length === 11 && d.startsWith("1") ? d.slice(1) : d.length === 10 ? d : null;
  return us ? `(${us.slice(0, 3)}) ${us.slice(3, 6)}-${us.slice(6)}` : p;
}

export function SettingsScreen() {
  const hydrated = useHydrated();
  const me = useMe();
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
  const name = displayName(me);
  const photo = me.photo_urls[0];
  const fade = (i: number) => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { ...GENTLE, delay: 0.04 + i * STAGGER } });

  const left = (
    <>
      <motion.div {...fade(0)}>
        <Section label="Account">
          <Card>
            <Row
              href="/app/profile/edit"
              lead={
                photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="" className="size-12 shrink-0 rounded-full object-cover" />
                ) : (
                  <Disc initial={name.slice(0, 1)} size={48} />
                )
              }
              label={<span data-nc>{name}</span>}
              hint={me.phone ? prettyPhone(me.phone) : "Edit profile"}
              value="Edit"
              arrow
            />
          </Card>
        </Section>
      </motion.div>
      <motion.div {...fade(1)}>
        <Section label="Mode" className="mt-s6">
          <ModePicker />
        </Section>
      </motion.div>
      <motion.div {...fade(2)}>
        <Section label="Notifications" className="mt-s6">
          <Card>
            <Row icon="bell" label="Reminders" hint={remindersHint(prefs.reminders)} value={remindersValue(prefs.reminders)} arrow onClick={() => go("reminders")} className="yo-row-wrap" />
            <Row icon="why" label="AI plans" hint="Plans from your free times" value={prefs.claude ? "On" : "Off"} arrow onClick={() => go("ai")} />
          </Card>
        </Section>
      </motion.div>
    </>
  );

  const right = (
    <>
      <motion.div {...fade(3)}>
        <Section label="Privacy and safety">
          <Card>
            <Row icon="shield" tone="safe" label="Privacy and terms" hint="What others see, your data" arrow onClick={() => go("privacy")} />
            <Row icon="blocked" tone="safe" label="Blocked" value={<span className="tabular-nums">{blocked ? blocked : "No one"}</span>} arrow onClick={() => go("blocked")} />
            <Row icon="here" tone="safe" label="If something’s off" hint="Emergency lines and reporting" href="/app/safety" arrow />
          </Card>
        </Section>
      </motion.div>
      <motion.div {...fade(4)}>
        <Section label="Help" className="mt-s6">
          <Card>
            <Row icon="list" label="Guidelines" href="/safety" arrow />
            {CONTACT.ready && <Row icon="mail" label={CONTACT.label} href={CONTACT.href} external={CONTACT.external} arrow />}
          </Card>
        </Section>
      </motion.div>
      <motion.div {...fade(5)}>
        <Section className="mt-s6">
          <Card>
            <Row
              icon="exit"
              label="Sign out"
              onClick={() => {
                leaving.current = true;
                signOut();
                // a full load to Welcome back (sign in), so the signed-out redirect to sign-up can't win the race
                window.location.assign(SIGNED_OUT_HREF);
              }}
            />
            <Row icon="trash" tone="danger" label="Delete my account" hint="Removes your profile and pods for good" onClick={() => go("delete")} />
          </Card>
        </Section>
      </motion.div>
    </>
  );

  return (
    <YouPage>
      <YouHead back="/app/profile" backLabel="Your profile" title="Settings" />
      <div className="yo-wrap yo-body">
        <div className="yo-cols" data-even>
          <div>{left}</div>
          <div>{right}</div>
        </div>
      </div>

      <RemindersSheet open={sheet === "reminders"} onClose={close} />
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
          notify("Your account is deleted.");
        }}
      />
    </YouPage>
  );
}
