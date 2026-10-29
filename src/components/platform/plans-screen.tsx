// /app/plans: your hangouts as an agenda (PLATFORM_SPEC §F4). Redesign r3 (founder: "a thorough relook"):
//   head     compact "Plans" + one status line, the Upcoming / Past switch right under it on the left
//   agenda   grouped "This week" / "Later": the date (a block on laptop, a chip in the header row on phone so the body
//            uses the full width), the pod, title, time and place, a status pill, the seat count, and the action right
//            on the row (I'm in, Directions, Calendar; 40px buttons). The row opens the plan's details.
//   aside    laptop: the next hangout in full (who's in, what to bring, rain backup, why) and where it is in the loop
//            (a small stepper: proposed → locks at 4 → check in → vote next). No second "I'm in": the row has it.
//   past     Went / Missed, with Check in or Vote on the next one while those are open
// Titles, times and places come from plan-display, the one plan display helper every surface uses.
"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { SNAPPY, STAGGER, Stage } from "@/components/brand";
import { POD_SOLID, type PodHueKey } from "@/components/brand/disc";
import { Icon } from "@/components/icons";
import { roomTables } from "@/components/pods/model";
import { Chrome } from "@/components/shell";
import { PageSkeleton } from "@/components/shell/store-gate";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { notify } from "@/components/ui/toast";
import { useDb, useHydrated, useRepo } from "@/lib/db/hooks";
import { useStore } from "@/lib/db/store";
import { directionsUrl } from "@/lib/platform/directions";
import { downloadIcs, icsFilename, icsForPlan } from "@/lib/platform/ics";
import { myPlans, type PlanItem } from "@/lib/platform/selectors";
import { nowISO, useClock } from "@/lib/time/clock";
import { TZ, toChicagoISO } from "@/lib/time/tz";
import type { DbState } from "@/lib/types";
import { formatInTimeZone } from "date-fns-tz";
import {
  planPlace,
  planSoon,
  planSpan,
  planTitle,
} from "@/components/planner/plan-display";

type Tab = "upcoming" | "past";
type Status = {
  key:
    | "needs"
    | "lock"
    | "in"
    | "locked"
    | "vote"
    | "went"
    | "missed"
    | "checkin"
    | "out";
  label: string;
};

interface Extra {
  size: number;
  threshold: number;
  names: string[];
  bring: string[];
  reason: string;
  cost: string;
  rain: string | null;
  vote: boolean;
  checkinOpen: boolean;
}

const span = (p: PlanItem) => planSpan(p.starts_at, p.ends_at);
const place = (p: PlanItem) => planPlace(p.venue);
const titleOf = (p: PlanItem) => planTitle(p.title, p.starts_at);
const BTN = "h-10 px-4 text-[14px]";
const planHref = (p: PlanItem) => `/app/pods/${p.podId}/plan/${p.id}`;

function extrasFor(
  db: DbState,
  items: PlanItem[],
  nowMs: number,
): Record<string, Extra> {
  const threshold = db.config.planner.lockThreshold;
  const out: Record<string, Extra> = {};
  for (const p of items) {
    const s = db.hangouts[p.id]
      ? db.suggestions[db.hangouts[p.id].suggestion_id]
      : db.suggestions[p.id];
    const members = db.memberships.filter(
      (m) => m.pod_id === p.podId && !m.left_at,
    );
    const names = db.rsvps
      .filter((r) => r.hangout_id === p.id && r.status === "going")
      .map((r) =>
        r.user_id === db.me
          ? "You"
          : db.users[r.user_id]?.nickname?.trim() ||
            db.users[r.user_id]?.first_name ||
            "",
      )
      .filter(Boolean);
    const open = Object.values(db.votes).some(
      (v) => v.pod_id === p.podId && v.status === "open",
    );
    const roundSize =
      !p.locked && s
        ? Object.values(db.suggestions).filter(
            (x) =>
              x.pod_id === p.podId &&
              x.round === s.round &&
              x.status !== "replaced",
          ).length
        : 0;
    const ended = Date.parse(p.ends_at);
    out[p.id] = {
      size: Math.max(members.length, p.going),
      threshold,
      names,
      bring: s?.plan_json.bring ?? [],
      reason: (s?.plan_json.reason ?? "").replace(/\.$/, ""),
      cost: /^free\b/i.test(s?.plan_json.cost ?? "")
        ? "Free"
        : (s?.plan_json.cost ?? "").replace(/\.$/, ""),
      rain: p.venue?.indoor
        ? "Indoors already"
        : p.rainVenue
          ? `Moves to ${planPlace(p.rainVenue)}`
          : null,
      vote: open && (roundSize > 1 || p.kind === "hangout"),
      checkinOpen:
        p.kind === "hangout" &&
        p.me === "going" &&
        !p.checkedIn &&
        nowMs >= ended - 30 * 60_000 &&
        nowMs - ended < 24 * 3_600_000,
    };
  }
  return out;
}

function statusOf(p: PlanItem, x: Extra | undefined, past: boolean): Status {
  if (past)
    return x?.checkinOpen
      ? { key: "checkin", label: "Check in" }
      : p.checkedIn
        ? { key: "went", label: "Went" }
        : {
            key: "missed",
            label: p.me === "going" ? "Not checked in" : "Missed",
          };
  if (x?.vote && !p.locked) return { key: "vote", label: "Vote open" };
  if (p.locked)
    return {
      key: "locked",
      label: p.me === "going" ? "Locked · you're in" : "Locked",
    };
  if (p.me === "going") return { key: "in", label: "You're in" };
  if (p.me === "not_going") return { key: "out", label: "Can't make it" };
  const left = x ? Math.max(0, x.threshold - p.going) : 0;
  return left > 0
    ? { key: "lock", label: `${left} more to lock` }
    : { key: "needs", label: "Needs you" };
}

const PILL: Record<Status["key"], string> = {
  needs:
    "bg-[var(--color-warning-soft)] text-[var(--color-warning-text)] shadow-[inset_0_0_0_1px_var(--color-warning-border)]",
  lock: "bg-[var(--color-warning-soft)] text-[var(--color-warning-text)] shadow-[inset_0_0_0_1px_var(--color-warning-border)]",
  vote: "bg-[var(--color-info-soft)] text-[var(--color-info-text)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-info-text)_25%,transparent)]",
  in: "bg-[var(--color-success-soft)] text-[var(--color-success-text)] shadow-[inset_0_0_0_1px_var(--color-success-border)]",
  locked: "bg-select text-on-select",
  went: "bg-[var(--color-success-soft)] text-[var(--color-success-text)]",
  checkin: "bg-select text-on-select",
  missed: "bg-sunken text-ink-2",
  out: "bg-sunken text-ink-2",
};

function Pill({ s }: { s: Status }) {
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-s2 text-[12px] leading-none font-semibold whitespace-nowrap ${PILL[s.key]}`}
    >
      {s.key === "locked" && <Icon name="locked" size={12} />}
      {s.label}
    </span>
  );
}

function useActions() {
  const repo = useRepo();
  const rsvp = async (p: PlanItem, s: "going" | "not_going") => {
    const r = await repo.rsvp(p.id, s);
    if (!r.ok) return notify.error("Not sent.");
    if (s === "going" && r.data.locked)
      return notify.success(`Locked. ${p.podName} is on.`);
    notify(s === "going" ? `You're in. ${p.podName}.` : "Seat given back.", {
      undo: () => void repo.rsvp(p.id, s === "going" ? "not_going" : "going"),
    });
  };
  const calendar = (p: PlanItem) => {
    const db = useStore.getState().db;
    const target = db.hangouts[p.id] ?? db.suggestions[p.id];
    if (!target) return;
    const day = formatInTimeZone(p.starts_at, TZ, "EEE MMM d");
    downloadIcs(
      icsForPlan(target, p.venue, nowISO(), window.location.origin),
      icsFilename(`${p.podName} ${day}`),
    );
    notify.success("Calendar file saved.");
  };
  return { rsvp, calendar };
}

export function PlansScreen() {
  const hydrated = useHydrated();
  const now = useClock(60_000);
  const t = now.getTime();
  const { upcoming, past } = useDb(useCallback((db) => myPlans(db, t), [t]));
  const hues = useDb(
    useCallback(
      (db) =>
        Object.fromEntries(
          roomTables(db, t).map((r) => [r.row.pod.id, r.hue]),
        ) as Record<string, PodHueKey>,
      [t],
    ),
  );
  const extra = useDb(
    useCallback(
      (db) => extrasFor(db, [...upcoming, ...past], t),
      [upcoming, past, t],
    ),
  );
  const [tab, setTab] = useState<Tab>("upcoming");
  if (!hydrated) return <PageSkeleton />;

  const hueOf = (id: string): PodHueKey => hues[id] ?? "ember";
  const weekEnd = t + 7 * 86_400_000;
  const thisWeek = upcoming.filter((p) => Date.parse(p.starts_at) < weekEnd);
  const later = upcoming.filter((p) => Date.parse(p.starts_at) >= weekEnd);
  const lead = upcoming[0] ?? null;
  const needs = upcoming.filter(
    (p) => !p.locked && p.me !== "going" && p.me !== "not_going",
  ).length;
  const summary = !upcoming.length
    ? "Nothing planned right now"
    : [
        `${upcoming.length} coming up`,
        needs
          ? `${needs} need${needs === 1 ? "s" : ""} your answer`
          : "all answered",
      ].join(" · ");

  return (
    <>
      <Stage light="paper" />
      <div className="min-h-[100dvh] pb-[calc(var(--s12)+var(--shell-bottom,0px)+env(safe-area-inset-bottom))]">
        <Chrome left="mark" right="none" className="lg:hidden" />
        <div className="mx-auto w-full max-w-[1280px] px-gutter pt-s4 lg:px-s12 lg:pt-s10">
          <header>
            <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.025em] text-ink">
              Plans
            </h1>
            <p className="mt-s1 text-[15px] leading-[20px] text-ink-2">
              {summary}
            </p>
            <Segmented
              className="mt-s4"
              label="Show"
              size="sm"
              value={tab}
              onChange={setTab}
              options={[
                {
                  value: "upcoming",
                  label: "Upcoming",
                  count: upcoming.length,
                },
                { value: "past", label: "Past", count: past.length },
              ]}
            />
          </header>

          <div className="mt-s6 grid gap-s8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:gap-s10">
            <div className="flex min-w-0 flex-col gap-s8">
              {tab === "upcoming" ? (
                upcoming.length ? (
                  <>
                    {thisWeek.length > 0 && (
                      <Group
                        label="This week"
                        items={thisWeek}
                        extra={extra}
                        hueOf={hueOf}
                        now={t}
                      />
                    )}
                    {later.length > 0 && (
                      <Group
                        label="Later"
                        items={later}
                        extra={extra}
                        hueOf={hueOf}
                        now={t}
                        offset={thisWeek.length}
                      />
                    )}
                  </>
                ) : (
                  <Empty
                    title="Nothing planned yet"
                    body="Once you're in a pod, the AI plans the first hangout around when everyone's free."
                    href="/app/pods"
                    cta="Go to your pods"
                  />
                )
              ) : past.length ? (
                <Group
                  label="Past"
                  items={past}
                  extra={extra}
                  hueOf={hueOf}
                  now={t}
                  past
                />
              ) : (
                <Empty
                  title="No past hangouts yet"
                  body={
                    lead
                      ? `Your first one is ${formatInTimeZone(lead.starts_at, TZ, "EEEE")}. Afterwards you check in here and vote on the next one.`
                      : "After each hangout you check in here and vote on the next one."
                  }
                  href={lead ? planHref(lead) : "/app/pods"}
                  cta={lead ? "See the next plan" : "Go to your pods"}
                />
              )}
            </div>
            {lead && tab === "upcoming" && (
              <aside className="hidden lg:block" aria-label="Next up">
                <div className="sticky top-s8">
                  <NextUp
                    p={lead}
                    x={extra[lead.id]}
                    hue={hueOf(lead.podId)}
                    now={t}
                  />
                </div>
              </aside>
            )}
            {tab === "past" && <div className="hidden lg:block" />}
          </div>
        </div>
      </div>
    </>
  );
}

function Group({
  label,
  items,
  extra,
  hueOf,
  now,
  past,
  offset = 0,
}: {
  label: string;
  items: PlanItem[];
  extra: Record<string, Extra>;
  hueOf: (id: string) => PodHueKey;
  now: number;
  past?: boolean;
  offset?: number;
}) {
  return (
    <section aria-label={label}>
      <h2 className="text-[13px] leading-[18px] font-medium text-ink-2">
        {label}
      </h2>
      <ul className="mt-s3 flex flex-col gap-s3">
        {items.map((p, i) => (
          <AgendaRow
            key={p.id}
            p={p}
            x={extra[p.id]}
            hue={hueOf(p.podId)}
            now={now}
            i={i + offset}
            past={past}
          />
        ))}
      </ul>
    </section>
  );
}

function DateBlock({
  iso,
  now,
  muted,
}: {
  iso: string;
  now: number;
  muted?: boolean;
}) {
  const today =
    toChicagoISO(now).slice(0, 10) ===
    toChicagoISO(Date.parse(iso)).slice(0, 10);
  return (
    <span
      aria-hidden
      className={`tabular hidden w-14 shrink-0 sm:flex flex-col items-center justify-center self-start rounded-[14px] py-s2 ${muted ? "bg-sunken text-ink-2" : "bg-lit text-ink shadow-[inset_0_0_0_1px_var(--line)]"}`}
    >
      <span
        className={`text-[11px] leading-[14px] font-semibold uppercase ${today && !muted ? "text-[var(--color-link)]" : "text-ink-2"}`}
      >
        {today ? "Today" : formatInTimeZone(iso, TZ, "EEE")}
      </span>
      <span className="text-[24px] leading-[28px] font-semibold tracking-[-0.02em]">
        {formatInTimeZone(iso, TZ, "d")}
      </span>
      <span className="text-[11px] leading-[14px] font-medium text-ink-2 uppercase">
        {formatInTimeZone(iso, TZ, "MMM")}
      </span>
    </span>
  );
}

/** Phone: the date as a chip in the header row ("Sat, Nov 7" / "Today"), so the body keeps the full width. */
function DateChip({
  iso,
  now,
  muted,
}: {
  iso: string;
  now: number;
  muted?: boolean;
}) {
  const today = planSoon(iso, now) === "Today";
  return (
    <span
      className={`tabular inline-flex h-6 shrink-0 items-center rounded-[8px] px-s2 text-[12px] leading-none font-semibold sm:hidden ${muted ? "bg-sunken text-ink-2" : today ? "bg-[var(--color-info-soft)] text-[var(--color-info-text)]" : "bg-sunken text-ink"}`}
    >
      {today ? "Today" : formatInTimeZone(iso, TZ, "EEE, MMM d")}
    </span>
  );
}

function Count({ p, x, locked }: { p: PlanItem; x?: Extra; locked: boolean }) {
  const of = x?.size ?? p.going;
  const at = x?.threshold ?? 4;
  return (
    <span className="flex min-w-0 items-center gap-s2">
      <span
        aria-hidden
        className="relative h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-sunken"
      >
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${locked ? "bg-select" : "bg-[var(--color-success)]"}`}
          style={{
            width: `${Math.min(100, (p.going / Math.max(1, of)) * 100)}%`,
          }}
        />
        <span
          className="absolute inset-y-0 w-px bg-ink/40"
          style={{ left: `${(at / Math.max(1, of)) * 100}%` }}
        />
      </span>
      <span className="tabular truncate text-[13px] leading-[18px] font-semibold text-ink-2">
        {p.going} of {of} in
      </span>
    </span>
  );
}

function AgendaRow({
  p,
  x,
  hue,
  now,
  i,
  past,
}: {
  p: PlanItem;
  x?: Extra;
  hue: PodHueKey;
  now: number;
  i: number;
  past?: boolean;
}) {
  const reduce = useReducedMotion();
  const { rsvp, calendar } = useActions();
  const s = statusOf(p, x, !!past);
  const answer =
    !past && p.me !== "going" && p.me !== "not_going" && s.key !== "vote";
  return (
    <motion.li
      className="relative rounded-[20px] bg-lit/90 p-s4 shadow-[inset_0_0_0_1px_var(--line),var(--shadow-xs)]"
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SNAPPY, delay: Math.min(i, 8) * STAGGER }}
    >
      <div className="flex gap-s3 sm:gap-s4">
        <DateBlock iso={p.starts_at} now={now} muted={past} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-s2">
            <span className="flex min-w-0 items-center gap-s2 text-[13px] leading-[18px] font-medium text-ink-2">
              <DateChip iso={p.starts_at} now={now} muted={past} />
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ background: POD_SOLID[hue] }}
              />
              <span className="truncate">
                {p.podName}
                {p.sequence ? ` · #${p.sequence}` : ""}
              </span>
            </span>
            <Pill s={s} />
          </div>
          <Link
            href={planHref(p)}
            scroll={false}
            className="mt-s2 block rounded-[6px] outline-offset-2 after:absolute after:inset-0 after:rounded-[20px] after:content-['']"
          >
            <span
              className={`block text-[17px] leading-[22px] font-semibold tracking-[-0.01em] ${past ? "text-ink-2" : "text-ink"}`}
            >
              {titleOf(p)}
            </span>
          </Link>
          <p className="tabular mt-0.5 truncate text-[14px] leading-[20px] text-ink-2">
            {span(p)} · {place(p)}
            {x?.cost && !past ? ` · ${x.cost}` : ""}
          </p>
          {!past && (
            <div className="mt-s3 flex flex-wrap items-center justify-between gap-x-s3 gap-y-s2">
              <Count p={p} x={x} locked={p.locked} />
              <div className="relative z-10 flex items-center gap-s2">
                {s.key === "vote" ? (
                  <Button asChild size="sm" className={BTN}>
                    <Link href={`/app/pods/${p.podId}`}>Vote</Link>
                  </Button>
                ) : answer ? (
                  <Button
                    size="sm"
                    className={BTN}
                    variant="spark"
                    onClick={() => void rsvp(p, "going")}
                  >
                    I&apos;m in
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className={BTN}
                    variant="secondary"
                    onClick={() => calendar(p)}
                  >
                    Add to calendar
                  </Button>
                )}
                {p.venue && (
                  <Button asChild size="sm" className={BTN} variant="secondary">
                    <a
                      href={directionsUrl(p.venue)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Directions to ${place(p)}`}
                    >
                      Directions
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
          {past && (s.key === "checkin" || x?.vote) && (
            <div className="relative z-10 mt-s3 flex gap-s2">
              <Button asChild size="sm" className={BTN}>
                <Link href={`/app/pods/${p.podId}`}>
                  {s.key === "checkin" ? "Check in" : "Vote on the next one"}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.li>
  );
}

/** Laptop: the next hangout in full beside the agenda, so the width carries the details instead of white space. */
function NextUp({
  p,
  x,
  hue,
  now,
}: {
  p: PlanItem;
  x?: Extra;
  hue: PodHueKey;
  now: number;
}) {
  const { rsvp, calendar } = useActions();
  const s = statusOf(p, x, false);
  const when = planSoon(p.starts_at, now) || "Now";
  return (
    <div className="overflow-hidden rounded-[24px] bg-lit shadow-[inset_0_0_0_1px_var(--line),var(--shadow-md)]">
      <div
        className="px-s6 pt-s6 pb-s4"
        style={{
          background: `linear-gradient(180deg, color-mix(in srgb, ${POD_SOLID[hue]} 10%, var(--lit)), var(--lit))`,
        }}
      >
        <div className="flex items-center justify-between gap-s2">
          <span className="text-[13px] leading-[18px] font-medium text-ink-2">
            Next up · {when}
          </span>
          <Pill s={s} />
        </div>
        <Link
          href={planHref(p)}
          scroll={false}
          className="mt-s2 block text-[22px] leading-[28px] font-semibold tracking-[-0.02em] text-ink hover:underline"
        >
          {titleOf(p)}
        </Link>
        <p className="tabular mt-s1 text-[15px] leading-[20px] text-ink-2">
          {formatInTimeZone(p.starts_at, TZ, "EEE, MMM d")} · {span(p)}
        </p>
        <p className="text-[15px] leading-[20px] text-ink-2">{place(p)}</p>
      </div>
      <dl className="divide-y divide-line border-t border-line px-s6">
        <Fact k="Who's in" icon="person">
          {x?.names.length ? x.names.join(", ") : "No one yet"}
          <span className="block font-normal text-ink-2">
            {p.locked
              ? "Locked"
              : `${Math.max(0, (x?.threshold ?? 4) - p.going)} more and it locks`}{" "}
            · {p.going} of {x?.size ?? p.going}
          </span>
        </Fact>
        {!!x?.bring.length && (
          <Fact k="Bring" icon="check">
            {x.bring.slice(0, 3).join(" · ")}
          </Fact>
        )}
        {x?.rain && (
          <Fact k="Rain backup" icon="rain">
            {x.rain}
          </Fact>
        )}
        {x?.reason && (
          <Fact k="Why this plan" icon="why">
            {x.reason}
          </Fact>
        )}
      </dl>
      <Stepper
        at={x?.vote ? 3 : x?.checkinOpen ? 2 : p.locked ? 1 : 0}
        threshold={x?.threshold ?? 4}
      />
      <div className="flex flex-wrap gap-s2 border-t border-line px-s6 py-s4">
        {p.me === "going" && !p.locked ? (
          <Button
            size="sm"
            className={BTN}
            variant="secondary"
            onClick={() => void rsvp(p, "not_going")}
          >
            Can&apos;t make it
          </Button>
        ) : null}
        <Button
          size="sm"
          className={BTN}
          variant="secondary"
          onClick={() => calendar(p)}
        >
          Add to calendar
        </Button>
        <Button asChild size="sm" className={BTN} variant="ghost">
          <Link href={planHref(p)} scroll={false}>
            Full plan
          </Link>
        </Button>
      </div>
    </div>
  );
}

function Fact({
  k,
  icon,
  children,
}: {
  k: string;
  icon: "person" | "check" | "rain" | "why";
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[20px_minmax(0,1fr)] gap-s3 py-s3">
      <Icon
        name={icon}
        size={18}
        className={
          icon === "rain"
            ? "mt-0.5 text-[var(--color-info-text)]"
            : icon === "why"
              ? "mt-0.5 text-select"
              : "mt-0.5 text-ink-2"
        }
      />
      <div className="min-w-0">
        <dt className="text-[12px] leading-[16px] font-medium text-ink-2">
          {k}
        </dt>
        <dd className="mt-0.5 text-[15px] leading-[20px] font-semibold text-ink">
          {children}
        </dd>
      </div>
    </div>
  );
}

function Empty({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <section className="flex flex-col items-start gap-s3 rounded-[20px] bg-lit/90 p-s6 shadow-[inset_0_0_0_1px_var(--line)]">
      <Icon name="day" size={24} className="text-ink-2" />
      <h2 className="text-[17px] leading-[22px] font-semibold text-ink">
        {title}
      </h2>
      <p className="max-w-[46ch] text-[15px] leading-[22px] text-ink-2">
        {body}
      </p>
      <Button asChild size="sm" variant="secondary" className="mt-s1">
        <Link href={href}>{cta}</Link>
      </Button>
    </section>
  );
}

/** Where the next plan is in the loop (Fit + Repeat), so every status pill reads: proposed → locks at 4 → check in → vote. */
function Stepper({ at, threshold }: { at: number; threshold: number }) {
  const steps = ["Proposed", `Locks at ${threshold}`, "Check in", "Vote next"];
  return (
    <ol
      aria-label="How plans work"
      className="flex items-center gap-s2 border-t border-line px-s6 py-s3"
    >
      {steps.map((label, i) => (
        <li
          key={label}
          aria-current={i === at ? "step" : undefined}
          className="flex min-w-0 flex-1 items-center gap-s2 last:flex-none"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              aria-hidden
              className={`size-2 shrink-0 rounded-full ${i < at ? "bg-[var(--color-success)]" : i === at ? "bg-select shadow-[0_0_0_3px_color-mix(in_srgb,var(--select)_22%,transparent)]" : "bg-line-2"}`}
            />
            <span
              className={`truncate text-[12px] leading-[16px] whitespace-nowrap ${i === at ? "font-semibold text-ink" : "font-medium text-ink-2"}`}
            >
              {label}
            </span>
          </span>
          {i < steps.length - 1 && (
            <span aria-hidden className="h-px min-w-2 flex-1 bg-line" />
          )}
        </li>
      ))}
    </ol>
  );
}
