// /app/plans: your week, then the next hangout as the lead object, then what's later and what's past (PLATFORM_SPEC §F4).
// QA core r1: same title scale and gutter as Pods, Inbox and Discover (the Frame); "what you need to do" first; every row
// carries its state (Locked · In · Planned · Went) and its one quick action; a laptop uses the width (lead + week on the
// left, the list on the right) instead of a narrow list in a void.
//   week    seven day circles from today; a day with a plan fills with its pod's colour, a locked one wears a ring
//   lead    pod · title · when and where · "3 of 8 in" · I'm in (or Can't make it) · Directions · Add to calendar
//   later   one row each: the pod's bead, title, when, state, and I'm in when it still needs you
//   past    quiet rows with the outcome
"use client";

import Link from "next/link";
import { useCallback } from "react";
import { motion, useReducedMotion } from "motion/react";
import { GENTLE, PlanHalo, SNAPPY, STAGGER } from "@/components/brand";
import { POD_SOLID, POD_WASH, type PodHueKey } from "@/components/brand/disc";
import { Icon } from "@/components/icons";
import { Frame } from "@/components/pods/frame";
import { roomTables, shortDay, shortTime } from "@/components/pods/model";
import { Button } from "@/components/ui/button";
import { notify } from "@/components/ui/toast";
import { useDb, useRepo } from "@/lib/db/hooks";
import { useStore } from "@/lib/db/store";
import { directionsUrl } from "@/lib/platform/directions";
import { downloadIcs, icsFilename, icsForPlan } from "@/lib/platform/ics";
import { myPlans, type PlanItem } from "@/lib/platform/selectors";
import { nowISO, useClock } from "@/lib/time/clock";
import { toChicagoISO } from "@/lib/time/tz";
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/time/tz";

function stateWord(p: PlanItem): string {
  if (p.locked) return p.me === "going" ? "Locked · in" : "Locked";
  if (p.me === "going") return "In";
  if (p.me === "not_going") return "Can't";
  return "Planned";
}

function useActions() {
  const repo = useRepo();
  const rsvp = async (p: PlanItem, s: "going" | "not_going") => {
    const r = await repo.rsvp(p.id, s);
    if (!r.ok) return notify.error("Not sent.");
    notify(s === "going" ? `You're in. ${p.podName}.` : "Seat given back.", { undo: () => void repo.rsvp(p.id, s === "going" ? "not_going" : "going") });
  };
  const calendar = (p: PlanItem) => {
    const db = useStore.getState().db;
    const target = db.hangouts[p.id] ?? db.suggestions[p.id];
    if (!target) return;
    const day = formatInTimeZone(p.starts_at, TZ, "EEE MMM d");
    downloadIcs(icsForPlan(target, p.venue, nowISO(), window.location.origin), icsFilename(`${p.podName} ${day}`));
    notify.success("Calendar file saved.");
  };
  return { rsvp, calendar };
}

export function PlansScreen() {
  const now = useClock(60_000);
  const t = now.getTime();
  const { upcoming, past } = useDb(useCallback((db) => myPlans(db, t), [t]));
  const hues = useDb(useCallback((db) => Object.fromEntries(roomTables(db, t).map((r) => [r.row.pod.id, r.hue])) as Record<string, PodHueKey>, [t]));
  const sizes = useDb(useCallback((db) => Object.fromEntries(upcoming.map((p) => [p.podId, db.memberships.filter((m) => m.pod_id === p.podId && !m.left_at).length])), [upcoming]));
  const lead = upcoming[0] ?? null;
  const later = upcoming.slice(1);
  const hueOf = (id: string): PodHueKey => hues[id] ?? "ember";

  return (
    <Frame over="Plans" line={lead ? "Your week." : "Nothing planned yet."} wide>
      <div className="grid gap-s12 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:gap-x-s16">
        <div className="flex min-w-0 flex-col gap-s8">
          <Week upcoming={upcoming} now={t} hueOf={hueOf} />
          {lead ? (
            <Lead p={lead} now={t} hue={hueOf(lead.podId)} size={sizes[lead.podId] ?? 0} />
          ) : (
            <Link href="/app/pods" className="pressable flex min-h-16 items-center gap-s3 border-y border-line text-[17px] font-semibold text-ink outline-offset-[-2px]">
              <span className="flex-1">Your pods plan the first one</span>
              <Icon name="arrow" size={20} />
            </Link>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-s8">
          {later.length > 0 && (
            <section aria-label="Later">
              <h2 className="text-overline text-ink-2">Later</h2>
              <ul className="mt-s3 border-t border-line">
                {later.map((p, i) => (
                  <PlanRow key={p.id} p={p} now={t} hue={hueOf(p.podId)} i={i} />
                ))}
              </ul>
            </section>
          )}
          <section aria-label="Past">
            <h2 className="text-overline text-ink-2">Past</h2>
            {past.length ? (
              <ul className="mt-s3 border-t border-line">
                {past.map((p, i) => (
                  <PlanRow key={p.id} p={p} now={t} hue={hueOf(p.podId)} i={i} past />
                ))}
              </ul>
            ) : (
              <p className="mt-s3 border-t border-line pt-s4 text-label text-ink-2">Your hangouts land here after they happen.</p>
            )}
          </section>
        </div>
      </div>
    </Frame>
  );
}

/** Seven day circles from today. A day with a plan fills with its pod's colour; a locked day wears a ring. */
function Week({ upcoming, now, hueOf }: { upcoming: PlanItem[]; now: number; hueOf: (id: string) => PodHueKey }) {
  const reduce = useReducedMotion();
  const today = toChicagoISO(now).slice(0, 10);
  const days = Array.from({ length: 7 }, (_, i) => {
    const iso = toChicagoISO(now + i * 86_400_000);
    const date = iso.slice(0, 10);
    const plan = upcoming.find((p) => toChicagoISO(Date.parse(p.starts_at)).slice(0, 10) === date) ?? null;
    return { date, iso, plan };
  });
  return (
    <ol className="grid grid-cols-7 gap-s1" aria-label="This week">
      {days.map((d, i) => {
        const H = d.plan ? POD_SOLID[hueOf(d.plan.podId)] : null;
        const label = `${formatInTimeZone(d.iso, TZ, "EEEE")}${d.plan ? `: ${d.plan.podName} ${shortTime(d.plan.starts_at)}${d.plan.locked ? ", locked" : ""}` : ""}`;
        return (
          <motion.li
            key={d.date}
            aria-label={label}
            className="flex flex-col items-center gap-s1"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SNAPPY, delay: i * STAGGER * 0.6 }}
          >
            <span aria-hidden className={`text-[12px] font-semibold ${d.date === today ? "text-ink" : "text-ink-2"}`}>
              {formatInTimeZone(d.iso, TZ, "EEEEE")}
            </span>
            <span
              aria-hidden
              className={`tabular grid aspect-square w-full max-w-11 place-items-center rounded-full text-[15px] font-semibold ${d.plan ? "orb text-ink" : "text-ink-2"}`}
              style={
                d.plan && H
                  ? { ["--orb" as string]: H, ["--orb-wash" as string]: POD_WASH[hueOf(d.plan.podId)], boxShadow: d.plan.locked ? `0 0 0 2px var(--stage), 0 0 0 3.5px ${H}` : undefined }
                  : { boxShadow: d.date === today ? "inset 0 0 0 1.5px var(--ink)" : "inset 0 0 0 1px var(--line)" }
              }
            >
              {formatInTimeZone(d.iso, TZ, "d")}
            </span>
          </motion.li>
        );
      })}
    </ol>
  );
}

/** The next hangout: everything you need to act on it, in one object. */
function Lead({ p, now, hue, size }: { p: PlanItem; now: number; hue: PodHueKey; size: number }) {
  const { rsvp, calendar } = useActions();
  const place = p.venue ? (p.venue.short_name ?? p.venue.name) : null;
  return (
    <motion.section aria-label="Next" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={GENTLE}>
      <PlanHalo state={p.locked ? "locked" : "waiting"} radius={28} className="w-full">
        <div className="glass rounded-[28px] px-s6 pt-s6 pb-s5">
          <Link href={`/app/pods/${p.podId}`} className="pressable block rounded-[16px] outline-offset-4">
            <span className="flex items-center gap-s2 text-label text-ink-2">
              <span aria-hidden className="orb size-4 shrink-0" style={{ ["--orb" as string]: POD_SOLID[hue], ["--orb-wash" as string]: POD_WASH[hue] }} />
              {p.podName} · {stateWord(p)}
            </span>
            <span className="mt-s2 block text-[24px] leading-[1.15] font-semibold tracking-[-0.02em] text-ink [text-wrap:balance]">{place ? p.title.replace(/\s+at\s+.*$/i, "") : p.title}</span>
            <span className="tabular mt-s2 block text-[17px] text-ink-2">
              {shortDay(p.starts_at, now)} {shortTime(p.starts_at)}
              {place ? ` · ${place}` : ""}
            </span>
            <span className="tabular mt-s4 block text-[15px] font-semibold text-ink">
              {p.going} of {Math.max(size, p.going)} in
            </span>
          </Link>
          <div className="mt-s6 flex flex-wrap items-center gap-s2">
            {p.me === "going" ? (
              <Button variant="secondary" size="sm" onClick={() => void rsvp(p, "not_going")}>
                Can&apos;t make it
              </Button>
            ) : (
              <Button size="sm" onClick={() => void rsvp(p, "going")}>
                I&apos;m in
              </Button>
            )}
            {p.venue && (
              <Button asChild variant="secondary" size="sm">
                <a href={directionsUrl(p.venue)} target="_blank" rel="noreferrer">
                  Directions
                </a>
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => calendar(p)} aria-label="Add to calendar" leadingIcon={<Icon name="add" size={18} />}>
              Calendar
            </Button>
          </div>
        </div>
      </PlanHalo>
    </motion.section>
  );
}

function PlanRow({ p, now, hue, i, past }: { p: PlanItem; now: number; hue: PodHueKey; i: number; past?: boolean }) {
  const reduce = useReducedMotion();
  const { rsvp } = useActions();
  const outcome = p.checkedIn ? "Went" : p.me === "going" ? "Held" : "Missed";
  const needsYou = !past && !p.locked && p.me !== "going" && p.me !== "not_going";
  return (
    <motion.li
      className="border-b border-line"
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SNAPPY, delay: Math.min(i, 8) * STAGGER }}
    >
      <div className="flex min-h-[72px] items-center gap-s4 py-s2">
        <Link href={`/app/pods/${p.podId}`} className="pressable flex min-w-0 flex-1 items-center gap-s4 outline-offset-[-2px]">
          <span aria-hidden className="orb size-10 shrink-0" style={{ ["--orb" as string]: POD_SOLID[hue], ["--orb-wash" as string]: POD_WASH[hue], opacity: past ? 0.6 : 1 }} />
          <span className="min-w-0 flex-1">
            <span className={`block text-[17px] leading-[1.25] font-semibold [text-wrap:balance] ${past ? "text-ink-2" : "text-ink"}`}>{p.title}</span>
            <span className="tabular block text-label text-ink-2">
              {past ? formatInTimeZone(p.starts_at, TZ, "MMM d") : `${shortDay(p.starts_at, now)} ${shortTime(p.starts_at)}`} · {p.podName}
            </span>
          </span>
        </Link>
        {needsYou ? (
          <Button size="sm" variant="secondary" onClick={() => void rsvp(p, "going")}>
            I&apos;m in
          </Button>
        ) : (
          <span className="shrink-0 text-label font-semibold text-ink-2">{past ? outcome : stateWord(p)}</span>
        )}
      </div>
    </motion.li>
  );
}
