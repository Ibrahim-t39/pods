// Home (redesign): what is next, what needs you, your pods at a glance, and what your pods are saying.
//   (sweep 10/29: the lead is the soonest hangout whatever its state, see home-model.ts upNext)
//   head      compact: "Good morning, Chanda" + the date and one status line (PageHeader, used app-wide)
//   next      the lead plan as a card you can act on: day, time, activity, place, who's in, I'm in / Details
//             (the repeat loop and votes: one clear card with its one action)
//   needs     other pods waiting on you, each with its action in the row (I'm in, Vote, Check in)
//   pods      every pod as a compact row: orb (a dot per person), name, next plan, unread, status
//   activity  the last lines across your pods; tap to open that pod's Talk
// Phone: one column. Laptop: next + needs + pods on the left, activity on the right.
"use client";

import Link from "next/link";
import { useCallback } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { CirclesLoader, Disc, DiscStack, InCount, PlanHalo, Shared, Stage, sharedName } from "@/components/brand";
import { Icon } from "@/components/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/shell";
import { SearchGlyph } from "@/components/shell/nav-glyphs";
import { usePlanActions } from "@/components/planner/use-plan-actions";
import { useDb, useHydrated, useMe } from "@/lib/db/hooks";
import { useMoment } from "@/lib/journey/use-moment";
import { cardView } from "@/lib/planner/card-state";
import { directionsUrl } from "@/lib/platform/directions";
import { unreadCount } from "@/lib/platform/selectors";
import { useClock } from "@/lib/time/clock";
import { formatRelative } from "@/lib/time/format";
import { TZ } from "@/lib/time/tz";
import { cn } from "@/lib/cn";
import { firstName, opensAfter, roomTables, type RoomTable } from "./model";
import { greeting, inLine, planWhen, tableNeedsYou, upNext } from "./home-model";
import { PodOrb } from "./pod-orb";
import { StatusChip, activityWord, needsYou, planLines, statusOf } from "./pod-card";
import { WeekGlance } from "@/components/calendar/calendar";
import { sourceLine } from "./table-stage";
import { useLastRead } from "./use-last-read";
import { NewPodsOnHome } from "@/components/placement/new-pod";
import "./pods.css";

export function Home() {
  const hydrated = useHydrated();
  const now = useClock();
  const minute = Math.floor(now.getTime() / 60_000) * 60_000;
  const tables = useDb(useCallback((db) => roomTables(db, minute), [minute]));
  const moment = useMoment();
  const me = useMe();
  const unread = useDb(unreadCount);
  const { lastRead } = useLastRead();
  const unreadBy = useDb(
    useCallback(
      (db) => {
        const out: Record<string, number> = {};
        for (const id of Object.keys(db.messages)) {
          const seen = lastRead[id];
          out[id] = seen ? (db.messages[id] ?? []).filter((m) => m.kind === "text" && m.user_id !== db.me && m.created_at > seen).length : 0;
        }
        return out;
      },
      [lastRead],
    ),
  );

  if (!hydrated) {
    return (
      <div className="grid h-[100dvh] place-items-center">
        <CirclesLoader label="Loading your pods" size={96} />
      </div>
    );
  }

  const open = tables.filter((t) => t.open);
  const { lead, rest: needs } = upNext(tables, minute, moment.leadPodId);
  const closed = opensAfter(tables, minute);
  const greet = `${greeting(Number(formatInTimeZone(now, TZ, "H")))}${me?.first_name ? `, ${me.first_name}` : ""}`;
  const date = formatInTimeZone(now, TZ, "EEEE, MMM d");
  const waiting = needs.length + (lead && tableNeedsYou(lead) ? 1 : 0);
  const meta = `${date} · ${waiting ? `${waiting} ${waiting === 1 ? "thing needs" : "things need"} you` : "You're all set"}`;

  return (
    <>
      <Stage light={moment.light} />
      <div className="pods-home">
        <PageHeader
          title={greet}
          meta={meta}
          chromeRight={
            <Link href="/app/search" aria-label="Search" className="pressable inline-flex size-11 items-center justify-center rounded-full outline-offset-2">
              <SearchGlyph />
            </Link>
          }
        />
        <div className="pods-home-grid">
          <div className="pods-home-main">
            <NewPodsOnHome />
            {lead || needs.length > 0 || unread > 0 ? (
              <section aria-labelledby="h-next">
                <SectionHead id="h-next">Up next</SectionHead>
                {lead && <Lead table={lead} minute={minute} />}
                {(needs.length > 0 || unread > 0) && (
                <ul aria-label="Also needs you" className={cn("pods-card divide-y divide-line overflow-hidden", lead && "mt-s3")}>
                  {needs.map((t) => (
                    <li key={t.row.pod.id}>
                      <NeedRow table={t} minute={minute} />
                    </li>
                  ))}
                  {unread > 0 && (
                    <li>
                      <Link href="/app/inbox" className="pressable flex min-h-16 items-center gap-s3 px-s4 py-s2 outline-offset-[-2px] hover:bg-[color-mix(in_srgb,var(--ink)_3%,transparent)]">
                        <span aria-hidden className="tabular grid size-10 shrink-0 place-items-center rounded-full bg-sunken text-[15px] font-semibold text-ink">
                          {unread}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[16px] font-semibold text-ink">Inbox</span>
                          <span className="block truncate text-[14px] text-ink-2">{unread === 1 ? "1 new update" : `${unread} new updates`}</span>
                        </span>
                        <Icon name="arrow" size={16} stroke={2} className="text-ink-2" />
                      </Link>
                    </li>
                  )}
                </ul>
                )}
              </section>
            ) : (
              tables.length === 0 && <EmptyPods />
            )}

            {tables.length > 0 && (
              <section aria-labelledby="h-pods">
                <SectionHead id="h-pods" action={<HeadLink href="/app/pods" label="See all pods">See all</HeadLink>}>
                  Your pods
                </SectionHead>
                <ul className="pods-home-tiles">
                  {tables.map((t) => (
                    <li key={t.row.pod.id}>
                      <PodTile t={t} minute={minute} closed={closed} unread={unreadBy[t.row.pod.id] ?? 0} />
                    </li>
                  ))}
                </ul>
                <Link href="/app/discover" className="pressable mt-s2 inline-flex min-h-11 items-center gap-s2 text-label font-semibold text-ink outline-offset-2">
                  <Icon name="add" size={18} /> Find more pods
                </Link>
              </section>
            )}
          </div>
          <aside className="pods-home-side" aria-labelledby="h-week">
            <section aria-labelledby="h-week">
              <SectionHead id="h-week" action={<HeadLink href="/app/calendar">Calendar</HeadLink>}>
                Next 7 days
              </SectionHead>
              <WeekGlance />
            </section>
            {open.length > 0 && (
              <section aria-labelledby="h-activity" className="mt-s8">
                <SectionHead id="h-activity">From your pods</SectionHead>
                <Activity tables={open} />
              </section>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}

/** A section's text action: looks like a 20px label, hits at 44px (the ::before grows the target, not the text). */
function HeadLink({ href, label, children }: { href: string; label?: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="pressable relative -my-s2 inline-flex min-h-11 items-center text-label font-semibold text-select outline-offset-2 before:absolute before:-inset-x-s2 before:inset-y-0 before:content-['']"
    >
      {children}
    </Link>
  );
}

function SectionHead({ id, children, action }: { id: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-s3 flex min-h-6 items-center justify-between gap-s4">
      <h2 id={id} className="text-[15px] font-semibold tracking-[-0.005em] text-ink">
        {children}
      </h2>
      {action}
    </div>
  );
}

function EmptyPods() {
  return (
    <section className="pods-card flex flex-col items-start gap-s3 p-s6">
      <PodOrb hue="ember" people={8} size={48} open={false} />
      <h2 className="text-[20px] font-semibold tracking-[-0.015em] text-ink">Your pod is filling</h2>
      <p className="text-[15px] text-ink-2">We place you with 6 to 10 people near you. The AI plans the first hangout once it fills.</p>
      <Link href="/app/discover" className={buttonVariants({ variant: "secondary", size: "sm" })}>
        Browse pods
      </Link>
    </section>
  );
}

// ── your pods: each a glossy sphere with its next step ─────────────────
// Phone: one row per pod (orb left, words right), so every card is as tall as what it says. Wider: 2 x 2 tiles.

function PodTile({ t, minute, closed, unread }: { t: RoomTable; minute: number; closed: string; unread: number }) {
  const st = statusOf(t, closed);
  // a finished hangout is not "next": its chip (Check in, Run it back?) carries the pod until the next plan
  const ended = !!t.row.plan && Date.parse(t.row.plan.endsAt) <= minute;
  const plan = ended ? null : planLines(t, minute);
  const going = t.row.plan?.going.length ?? 0;
  // an on-deck pod says it once, in its chip ("Opens after Sat")
  const next = !t.open || (ended && st) ? null : plan ? `${plan.when} · ${plan.what}` : (t.row.lastLine ?? "The AI is planning");
  const inner = (
    <>
      <span className="pods-home-tile-orb">
        <PodOrb hue={t.hue} people={t.row.size} inCount={going} size={60} open={t.open} />
      </span>
      <span className="pods-home-tile-body">
        <span className="block truncate pr-s6 text-[16px] font-semibold text-ink">{t.row.name}</span>
        {next && <span className="mt-0.5 line-clamp-2 block text-[14px] leading-[1.35] text-ink-2">{next}</span>}
        {st && (
          <span className="pods-home-tile-chip">
            <StatusChip {...st} />
          </span>
        )}
      </span>
      {unread > 0 && (
        <span className="tabular absolute top-s4 right-s4 grid h-6 min-w-6 place-items-center rounded-full bg-select px-1.5 text-[12px] font-semibold text-on-select" aria-label={`${unread} new`}>
          {unread}
        </span>
      )}
    </>
  );
  const cls = "pods-card pods-home-tile relative";
  return t.open ? (
    <Link href={`/app/pods/${t.row.pod.id}`} className={cn(cls, "pressable outline-offset-2")}>
      {inner}
    </Link>
  ) : (
    <div className={cn(cls, "opacity-80")}>{inner}</div>
  );
}

// ── the lead plan ───────────────────────────────────────────────────────

/** Pod states where the pod's next step is not a dated plan: one card, its one action. */
const LOOP_CARD = ["checkin_due", "vote_open", "run_it_back", "forming", "generating", "quiet"];

function Lead({ table, minute }: { table: RoomTable; minute: number }) {
  const podId = table.row.pod.id;
  const view = useDb(useCallback((db) => cardView(db, podId, minute), [podId, minute]));
  const people = useDb(
    useCallback((db) => (view?.going ?? []).map((id) => ({ id, you: id === db.me, name: id === db.me ? (db.users[id]?.first_name ?? "") : firstName(db, id) })), [view?.going]),
  );
  const actions = usePlanActions(podId);
  const href = `/app/pods/${podId}`;
  const name = table.row.name;
  const st = statusOf(table, "");
  const s0 = table.row.status;

  if (LOOP_CARD.includes(s0) || !view?.suggestion) {
    const [line, cta] =
      s0 === "checkin_due"
        ? ["How did it go? Check in and say if you'd run it back.", "Check in"]
        : s0 === "vote_open"
          ? ["The pod is picking the next hangout. Add your vote.", "Vote"]
          : s0 === "run_it_back"
            ? ["Waiting on the pod's answers.", "Open"]
            : s0 === "forming"
              ? ["Your pod is filling. The AI plans the first hangout once it does.", "Open"]
              : ["The AI is planning the next hangout.", "Open"];
    return (
      <Link href={href} className="pods-card pressable flex items-center gap-s4 p-s4 outline-offset-2 lg:p-s6">
        <PodOrb hue={table.hue} people={table.row.size} size={52} needs={needsYou(table)} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-s2">
            <span className="text-[18px] font-semibold text-ink">{name}</span>
            {st && <StatusChip {...st} />}
          </span>
          <span className="mt-0.5 block text-[15px] text-ink-2">{line}</span>
        </span>
        <span className={cn(buttonVariants({ variant: needsYou(table) ? "spark" : "secondary", size: "sm" }), "max-sm:hidden")}>{cta}</span>
        <Icon name="arrow" size={16} stroke={2} className="text-ink-2 sm:hidden" />
      </Link>
    );
  }

  const s = view.suggestion;
  const startsAt = view.hangout?.starts_at ?? s.plan_json.starts_at;
  const placeName = view.venue ? (view.venue.short_name ?? view.venue.name) : null;
  const cost = (s.plan_json.cost ?? "").trim();
  const activity = activityWord(s.plan_json.event || s.summary);
  const when = planWhen(startsAt, minute);
  const canJoin = !view.imIn && !!view.targetId;
  const planHref = `/app/pods/${podId}/plan/${s.id}`;
  const now = s0 === "happening_now";
  const state = now ? "On now" : view.locked ? (view.imIn ? "Locked · You're in" : "Locked") : view.imIn ? "You're in" : null;
  const names = [...people].sort((a, b) => Number(b.you) - Number(a.you)).map((p) => (p.you ? "You" : p.name));

  return (
    <Shared name={sharedName.plan(s.id)}>
      <PlanHalo state={view.locked ? "locked" : "waiting"} radius={22} className="w-full">
        <div className="glass rounded-[22px] p-s4 lg:p-s6">
          <Link href={href} className="pressable relative -my-[10px] inline-flex min-h-11 items-center gap-s2 rounded-full outline-offset-2">
            <PodOrb hue={table.hue} people={view.size} inCount={view.going.length} size={24} />
            <span className="text-[15px] font-semibold text-ink">{name}</span>
            <span className="text-[14px] text-ink-2">· {sourceLine(s.source)}</span>
          </Link>
          <Link
            href={planHref}
            aria-label={`${activity}, ${when}${placeName ? `, ${placeName}` : ""}${state ? `. ${state}` : ""}. Plan details.`}
            className="pressable mt-s3 block rounded-[14px] outline-offset-2"
          >
            <span className="flex flex-wrap items-center gap-x-s3 gap-y-s1">
              <span className="tabular font-display text-[28px] leading-[1.1] font-semibold tracking-[-0.025em] text-ink lg:text-[32px]">{when}</span>
              {state && <StatusChip word={state} tone={now ? "grove" : "select"} />}
            </span>
            <span className="mt-1 block text-[16px] leading-[1.35] text-ink">
              {activity}
              <span className="text-ink-2">{[placeName, cost].filter(Boolean).length ? ` · ${[placeName, cost].filter(Boolean).join(" · ")}` : ""}</span>
            </span>
          </Link>
          <div className="mt-s4 flex flex-wrap items-center gap-x-s3 gap-y-s3 border-t border-line pt-s4">
            <span className="flex shrink-0 items-center gap-s2">
              {people.length > 0 && (
                <>
                  <span aria-hidden className="inline-flex">
                    <DiscStack size={28} max={4} people={people.map((p) => ({ initial: p.name.slice(0, 1).toUpperCase(), tone: p.you ? "you" : table.hue, seed: p.name }))} />
                  </span>
                  <span className="sr-only">{inLine(names)}</span>
                </>
              )}
              {people.length > 0 ? (
                <InCount n={view.going.length} of={view.size} className="text-[15px] whitespace-nowrap text-ink" />
              ) : (
                <span className="text-[15px] font-semibold text-ink">Be the first in</span>
              )}
            </span>
            <span className="ml-auto flex items-center gap-s2">
              <Link href={planHref} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Details
              </Link>
              {canJoin ? (
                <Button size="sm" variant="spark" loading={actions.busy} onClick={() => view.targetId && void actions.rsvp(view.targetId, "going", { when: startsAt })}>
                  I&apos;m in
                </Button>
              ) : view.locked && view.venue ? (
                <a href={directionsUrl(view.venue)} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "primary", size: "sm" })}>
                  <Icon name="place" size={18} /> Directions
                </a>
              ) : (
                <Link href={`${href}/chat`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                  <Icon name="talk" size={18} /> Talk
                </Link>
              )}
            </span>
          </div>
        </div>
      </PlanHalo>
    </Shared>
  );
}

// ── needs you: the quieter rows under the lead, each with its action in the row ──

function NeedRow({ table, minute }: { table: RoomTable; minute: number }) {
  const podId = table.row.pod.id;
  const actions = usePlanActions(podId);
  const p = table.row.plan;
  const s = table.row.status;
  const href = `/app/pods/${podId}`;
  const line =
    s === "needs_rsvp" && p
      ? `${planWhen(p.startsAt, minute)} · ${activityWord(p.s.plan_json.event || p.s.summary)} · ${p.going.length} of ${p.size} in`
      : s === "vote_open"
        ? "Pick a time for the next hangout"
        : s === "checkin_due"
          ? "Did you make it? Check in"
          : "Would you run it back?";
  return (
    <div className="flex min-h-16 items-center gap-s3 px-s4 py-s2">
      <Link href={href} className="pressable flex min-w-0 flex-1 items-center gap-s3 outline-offset-2">
        <PodOrb hue={table.hue} people={table.row.size} inCount={p?.going.length ?? 0} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-ink">{table.row.name}</span>
          <span className="block line-clamp-2 text-[14px] leading-[1.35] text-ink-2">{line}</span>
        </span>
      </Link>
      {s === "needs_rsvp" && p ? (
        <Button size="sm" variant="secondary" className="shrink-0" loading={actions.busy} onClick={() => void actions.rsvp(p.targetId, "going", { when: p.startsAt })}>
          I&apos;m in
        </Button>
      ) : (
        <Link href={href} className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "shrink-0")}>
          {s === "vote_open" ? "Vote" : s === "checkin_due" ? "Check in" : "Open"}
        </Link>
      )}
    </div>
  );
}

// ── pod activity ────────────────────────────────────────────────────────

function Activity({ tables }: { tables: RoomTable[] }) {
  const now = useClock(60_000);
  const ids = tables.map((t) => t.row.pod.id).join(",");
  const items = useDb(
    useCallback(
      (db) => {
        const pods = ids.split(",").filter(Boolean);
        return pods
          .flatMap((pid) =>
            (db.messages[pid] ?? [])
              .filter((m) => m.kind === "text" && m.user_id && m.user_id !== db.me)
              .slice(-4)
              .map((m) => ({ id: m.id, podId: pid, who: firstName(db, m.user_id), text: m.text, at: m.created_at })),
          )
          .sort((a, b) => b.at.localeCompare(a.at))
          .slice(0, 3);
      },
      [ids],
    ),
  );
  const byId = Object.fromEntries(tables.map((t) => [t.row.pod.id, t]));
  if (!items.length) {
    return <p className="pods-card p-s4 text-[15px] text-ink-2">Nothing new in your pods yet. Say hi in Talk.</p>;
  }
  return (
    <ul className="pods-card divide-y divide-line overflow-hidden">
      {items.map((m) => {
        const t = byId[m.podId];
        return (
          <li key={m.id}>
            <Link href={`/app/pods/${m.podId}/chat`} className="pressable flex items-start gap-s3 px-s4 py-s3 outline-offset-[-2px] hover:bg-[color-mix(in_srgb,var(--ink)_3%,transparent)]">
              <Disc initial={m.who.slice(0, 1).toUpperCase()} tone={t?.hue ?? "ember"} seed={m.who} size={32} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-s2">
                  <span className="truncate text-[14px] text-ink-2">
                    <span className="font-semibold text-ink">{m.who}</span> in {t?.row.name}
                  </span>
                  <span className="shrink-0 text-[12px] text-ink-3">{formatRelative(m.at, now)}</span>
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[15px] leading-[1.35] text-ink">{m.text}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
