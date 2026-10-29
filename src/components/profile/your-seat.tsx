// /app/profile: who you are and what Pods knows about you, at a glance and one tap from changing (redesign r2).
//   identity   photo (tap to change), name, age, since · Edit profile · three numbers (pods, hangouts, people)
//   pods       your pods with their colour, size and next hangout (tap opens the pod)
//   into       interests as chips: × removes, + Add opens the picker (adding one looks for a new pod)
//   community  your community pods in your own words, Edit
//   free       the week grid (read-only here; Edit opens the sheet)
//   more       Invite a friend · Settings · If something's off · Sign out · Delete my account (opens the confirm flow in Settings)
//   phone   one stack; laptop   identity + more on the left (sticky), pods / into / community / free on the right.
// Sheets are addressed by ?sheet= (likes, free, community, reminders, ai); account sheets forward to /app/settings.
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Disc } from "@/components/brand/disc";
import { GENTLE, STAGGER } from "@/components/brand/motion";
import { PullCircles } from "@/components/brand/pull-circles";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { notify } from "@/components/ui";
import { useStore } from "@/lib/db/store";
import { SIGNED_OUT_HREF, signOut } from "@/lib/safety/sign-out";
import { useDb, useHydrated, useMe, useRepo } from "@/lib/db/hooks";
import { myPlans, podLabel } from "@/lib/platform/selectors";
import { opensAfter, roomTables, shortDay } from "@/components/pods/model";
import { PodOrb } from "@/components/pods/pod-orb";
import { nowISO, useClock } from "@/lib/time/clock";
import { displayName, toPublicMember } from "@/lib/utils";
import type { DbState } from "@/lib/types";
import { podHue } from "./hue";
import { podNextLine } from "./pod-line";
import { useSeatPrefs } from "./local-prefs";
import { freeLine, remindersValue, shortLike } from "./words";
import { AiSheet, CommunitySheet, FreeSheet, LikesSheet, SEAT_SHEETS, RemindersSheet, useMyCommunities, type SeatSheet } from "./seat-sheets";
import { Card, Row, Section, TextAction, YouHead, YouPage } from "./you-kit";

/** Sheets that live on /app/settings now; an old Your seat address is forwarded there. */
const MOVED: Partial<Record<SeatSheet, string>> = { more: "", privacy: "privacy", blocked: "blocked", delete: "delete" };
const ALL = (db: DbState) => db;

export function YourSeat() {
  const me = useMe();
  const hydrated = useHydrated();
  const router = useRouter();
  const sp = useSearchParams();
  const asked = sp.get("sheet");
  const raw = (asked === "claude" ? "ai" : asked) as SeatSheet | null;
  const sheet = raw && SEAT_SHEETS.includes(raw) ? raw : null;
  useEffect(() => {
    if (asked === "help") router.replace("/app/safety");
    else if (raw && raw in MOVED) router.replace(MOVED[raw] ? `/app/settings?sheet=${MOVED[raw]}` : "/app/settings");
  }, [asked, raw, router]);
  useEffect(() => {
    if (hydrated && !me) router.replace("/app");
  }, [hydrated, me, router]);

  const repo = useRepo();
  const db = useDb(ALL);
  const now = useClock().getTime();
  const { prefs } = useSeatPrefs();
  const communities = useMyCommunities();
  const file = useRef<HTMLInputElement>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const go = (s: SeatSheet) => router.replace(`/app/profile?sheet=${s}`, { scroll: false });
  const close = () => router.replace("/app/profile", { scroll: false });

  if (!hydrated || !me) return null;

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

  const likes = db.userInterests
    .filter((u) => u.user_id === db.me)
    .map((u) => db.interests[u.interest_id])
    .filter(Boolean);
  async function removeLike(id: string, word: string) {
    setRemoving(id);
    const r = await repo.removeInterest(id);
    setRemoving(null);
    if (!r.ok) return notify.error("Not saved. Try again.");
    notify(`Removed ${word}`, { undo: () => void repo.addInterest(id) });
  }

  // Pods counts every pod you're in (as the Inbox does: "You're in 4 pods"); people counts the open ones. Pods that open after your first
  // hangout are listed muted, the same as on Pods.
  const plans = myPlans(db, now);
  const tables = roomTables(db, now);
  const opens = opensAfter(tables, now);
  const pods = tables.map((t) => {
    const p = t.row.pod;
    const members = db.memberships.filter((m) => m.pod_id === p.id && !m.left_at).length;
    return { id: p.id, name: podLabel(db, p), members, hue: podHue(db, p.id), open: t.open };
  });
  const people = new Set(tables.filter((t) => t.open).flatMap((t) => t.people.map((x) => x.id))).size;
  const went = plans.past.filter((p) => p.me === "going" || p.checkedIn).length;
  const firstUp = plans.upcoming[0]?.starts_at ?? null;

  const age = toPublicMember(me, nowISO()).age;
  const name = displayName(me);
  const photo = me.photo_urls[0];
  const joinedDays = (now - Date.parse(me.created_at)) / 86_400_000;
  const since =
    joinedDays < 7
      ? "Joined this week"
      : joinedDays < 31
        ? "Joined this month"
        : `Since ${new Date(me.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
  const fade = (i: number) => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { ...GENTLE, delay: 0.04 + i * STAGGER } });

  const identity = (
    <Card className="yo-pad">
      <div className="yo-id">
        <button type="button" className="yo-photo pressable" onClick={() => file.current?.click()} aria-label={photo ? "Change photo" : "Add a photo"}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" />
          ) : (
            <Disc initial={name.slice(0, 1)} size={72} />
          )}
          <span className="yo-photo-cam" aria-hidden>
            <Icon name="edit" size={14} />
          </span>
        </button>
        <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
        <div className="min-w-0 flex-1">
          <p className="yo-name" data-nc>
            {name}, <span className="tabular-nums">{age}</span>
          </p>
          <p className="mt-s1 text-[14px] text-ink-2">
            {me.verified ? "Verified · " : ""}
            {since}
          </p>
        </div>
      </div>
      <div className="yo-stats">
        <div className="yo-stat">
          <b>{pods.length}</b>
          <span>{pods.length === 1 ? "pod" : "pods"}</span>
        </div>
        {went > 0 || !firstUp ? (
          <div className="yo-stat">
            <b>{went}</b>
            <span>{went === 1 ? "hangout" : "hangouts"}</span>
          </div>
        ) : (
          <div className="yo-stat">
            <b>{shortDay(firstUp, now)}</b>
            <span>first hangout</span>
          </div>
        )}
        <div className="yo-stat">
          <b>{people}</b>
          <span>people</span>
        </div>
      </div>
      <Button asChild variant="secondary" size="sm" className="mt-s4 w-full">
        <Link href="/app/profile/edit">Edit profile</Link>
      </Button>
    </Card>
  );

  const more = (
    <Section label="More">
      <Card>
        <Row icon="add" label="Invite a friend" hint="Save them a seat in your pod" href="/app/invite" arrow />
        <Row icon="bell" label="Reminders" value={remindersValue(prefs.reminders)} onClick={() => go("reminders")} arrow />
        <Row icon="more" label="Settings" href="/app/settings" arrow />
        <Row icon="here" tone="safe" label="If something’s off" href="/app/safety" arrow />
      </Card>
      <Card className="mt-s3">
        <Row
          icon="exit"
          label="Sign out"
          onClick={() => {
            signOut();
            // a full load to Welcome back (sign in), so the signed-out redirect to sign-up can't win the race
            window.location.assign(SIGNED_OUT_HREF);
          }}
        />
        <Row icon="trash" tone="danger" label="Delete my account" hint="Removes your profile and pods for good" href="/app/settings?sheet=delete" />
      </Card>
    </Section>
  );

  return (
    <YouPage>
      <PullCircles label="Refreshing your profile" onRefresh={() => useStore.persist.rehydrate()} />
      <YouHead title="You" />
      <div className="yo-wrap yo-body">
        <div className="yo-cols">
          <motion.div className="yo-sticky" {...fade(0)}>
            {identity}
            <div className="hidden lg:block">
              <div className="mt-s6">{more}</div>
            </div>
          </motion.div>

          <div>
            <motion.div {...fade(1)}>
              <Section label="Your pods" action={<TextAction href="/app/discover">Find more</TextAction>}>
                {pods.length ? (
                  <Card>
                    {pods.map((p) => (
                      <Row
                        key={p.id}
                        href={`/app/pods/${p.id}`}
                        lead={<PodBead hue={p.hue} members={p.members} muted={!p.open} />}
                        label={<span data-nc>{p.name}</span>}
                        hint={
                          !p.open
                            ? `${p.members} people · ${opens}`
                            : `${p.members} people · ${podNextLine(db, p.id, plans.upcoming, now)}`
                        }
                        className={p.open ? undefined : "yo-row-muted"}
                        arrow
                      />
                    ))}
                  </Card>
                ) : (
                  <Card className="yo-pad">
                    <p className="text-[15px] text-ink-2">No pods yet. Add what you’re into and we’ll find one.</p>
                  </Card>
                )}
              </Section>
            </motion.div>

            <motion.div {...fade(2)}>
              <Section label="Into" action={<TextAction href="/app/profile/edit#into">Edit</TextAction>} className="mt-s6">
                <Card className="yo-pad">
                  <div className="yo-chips" role="list" aria-label="You’re into">
                    {likes.map((i) => {
                      const word = shortLike(i.id, i.label);
                      const label = word.charAt(0).toUpperCase() + word.slice(1);
                      return (
                        <span key={i.id} role="listitem" className="yo-chip">
                          {label}
                          <button
                            type="button"
                            className="yo-chip-x pressable"
                            aria-label={`Remove ${label}`}
                            disabled={removing === i.id || likes.length === 1}
                            onClick={() => removeLike(i.id, word)}
                          >
                            <Icon name="close" size={14} />
                          </button>
                        </span>
                      );
                    })}
                    <button type="button" className="yo-chip yo-chip-add pressable" onClick={() => go("likes")}>
                      <Icon name="add" size={16} />
                      Add
                    </button>
                  </div>
                  <p className="mt-s3 text-[14px] text-ink-2">Each one you add looks for a pod near you.</p>
                </Card>
              </Section>
            </motion.div>

            <motion.div {...fade(3)}>
              <Section label="Community pods" action={<TextAction onClick={() => go("community")}>{communities.length ? "Edit" : "Add"}</TextAction>} className="mt-s6">
                <Card className="yo-pad">
                  {communities.length ? (
                    <div className="yo-chips">
                      {communities.map((c) => (
                        <span key={c} className="yo-chip yo-chip-static" data-hue="grove" data-nc>
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[15px] text-ink-2">Off. Turn on to meet people who share your roots or faith.</p>
                  )}
                  <p className="mt-s3 text-[14px] text-ink-2">Only members of that pod see it.</p>
                </Card>
              </Section>
            </motion.div>

            <motion.div {...fade(4)}>
              <Section label="Free" action={<TextAction onClick={() => go("free")}>Edit</TextAction>} className="mt-s6">
                <Card className="yo-pad">
                  <p className="text-[17px] font-medium leading-[1.35] text-ink">{freeLine(me.availability)}</p>
                  <p className="mt-s3 text-[14px] text-ink-2">{prefs.claude ? "The AI plans hangouts inside these times." : "AI plans are off. Turn them on in Settings."}</p>
                </Card>
              </Section>
            </motion.div>

            <motion.div className="mt-s6 lg:hidden" {...fade(5)}>
              {more}
            </motion.div>
          </div>
        </div>
      </div>

      <LikesSheet open={sheet === "likes"} onClose={close} />
      <FreeSheet open={sheet === "free"} onClose={close} />
      <CommunitySheet open={sheet === "community"} onClose={close} />
      <RemindersSheet open={sheet === "reminders"} onClose={close} />
      <AiSheet open={sheet === "ai"} onClose={close} />
    </YouPage>
  );
}

/** A pod as the logo draws people: a solid circle in the pod's colour with white dots (one per person, up to 8). */
export function PodBead({ hue, members, size = 40, muted }: { hue: "ember" | "signal" | "grove"; members: number; size?: number; muted?: boolean }) {
  // one mark across the app: the shared PodOrb at its two list sizes (40, 28)
  return <PodOrb hue={hue} people={members} inCount={members} you={false} open={!muted} size={size <= 32 ? 28 : 40} />;
}
