// Calendar (round 10-29): every hangout and task across your pods, week or month, colour-coded by pod.
//   toolbar   Week | Month, the period, back / today / forward
//   grid      days with a dot per item in its pod's colour; tap a day to see it
//   day       that day's items (tap to open) and your time that day: Morning / Afternoon / Evening, one tap to flip
//             free or busy for this date only (the planner counts it)
//   sheet     Add to Google, Apple or Outlook (a subscribed feed), or download the .ics
// Phone: one column. Laptop: grid left, the day right.
"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { POD_SOLID, type PodHueKey } from "@/components/brand/disc";
import { CirclesLoader } from "@/components/brand";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/shell";
import { CalendarGlyph } from "@/components/shell/nav-glyphs";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { roomTables, shortTime } from "@/components/pods/model";
import { weekGlance } from "@/components/pods/home-model";
import { useDb, useHydrated, useMe } from "@/lib/db/hooks";
import { calendarItems, encodeFeed, feedEvents, subscribeLinks, type CalItem } from "@/lib/platform/calendar";
import { downloadIcs, icsFilename, icsForPlan } from "@/lib/platform/ics";
import { DAY_PARTS, PART_LABEL, exceptionAt, isFree } from "@/lib/availability/exceptions";
import { setException } from "@/lib/availability/write";
import { useClock } from "@/lib/time/clock";
import { chicagoDayKey } from "@/lib/time/tz";
import { cn } from "@/lib/cn";
import "@/components/pods/pods.css";
import "./calendar.css";

// ── date keys (YYYY-MM-DD, calendar arithmetic only) ─────────────────────
const toDate = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const keyOf = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (k: string, n: number) => {
  const d = toDate(k);
  d.setUTCDate(d.getUTCDate() + n);
  return keyOf(d);
};
/** Monday of the week holding k. */
export const weekStart = (k: string) => addDays(k, -((toDate(k).getUTCDay() + 6) % 7));
const fmt = (k: string, o: Intl.DateTimeFormatOptions) => toDate(k).toLocaleDateString("en-US", { timeZone: "UTC", ...o });
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function useCalendar() {
  const now = useClock();
  const minute = Math.floor(now.getTime() / 60_000) * 60_000;
  const items = useDb(useCallback((db) => calendarItems(db, minute), [minute]));
  const hues = useDb(
    useCallback((db) => Object.fromEntries(roomTables(db, minute).map((t) => [t.row.pod.id, t.hue])) as Record<string, PodHueKey>, [minute]),
  );
  const today = chicagoDayKey(now);
  const byDay = useMemo(() => {
    const m: Record<string, CalItem[]> = {};
    for (const i of items) (m[i.day] ??= []).push(i);
    return m;
  }, [items]);
  return { items, hues, today, byDay, minute };
}

/** Today when it has something on, else the next day up to `end` that does (else today). */
function firstBusy(byDay: Record<string, CalItem[]>, today: string, end: string): string {
  for (let k = today; k <= end; k = addDays(k, 1)) if (byDay[k]?.length) return k;
  return today;
}

const hueOf = (hues: Record<string, PodHueKey>, podId: string) => POD_SOLID[hues[podId] ?? "signal"];

// ── the page ─────────────────────────────────────────────────────────────

export function CalendarPage() {
  const hydrated = useHydrated();
  const { items, hues, today, byDay } = useCalendar();
  const [view, setView] = useState<"week" | "month">("week");
  const [picked, setPicked] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [share, setShare] = useState(false);
  const base = anchor ?? today;
  const sel = picked ?? firstBusy(byDay, today, view === "week" ? addDays(weekStart(base), 6) : addDays(today, 6));

  if (!hydrated) {
    return (
      <div className="grid h-[100dvh] place-items-center">
        <CirclesLoader label="Loading your calendar" size={96} />
      </div>
    );
  }

  const weekEnd = addDays(weekStart(today), 6);
  const thisWeek = items.filter((i) => i.day >= today && i.day <= weekEnd);
  const needs = thisWeek.filter((i) => i.needsYou).length;
  const meta = `${thisWeek.length ? `${thisWeek.length} this week` : "Nothing else this week"}${needs ? ` · ${needs} ${needs === 1 ? "needs" : "need"} you` : ""}`;

  const step = (dir: -1 | 1) => {
    if (view === "week") setAnchor(addDays(base, dir * 7));
    else {
      const d = toDate(base);
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() + dir);
      setAnchor(keyOf(d));
    }
  };
  const period =
    view === "week"
      ? `${fmt(weekStart(base), { month: "short", day: "numeric" })} – ${fmt(addDays(weekStart(base), 6), { month: "short", day: "numeric" })}`
      : fmt(base, { month: "long", year: "numeric" });

  return (
    <div className="pods-cal">
      <PageHeader title="Calendar" meta={meta} />
      <div className="pods-cal-grid">
        <section aria-label="Days" className="min-w-0">
          <div className="mb-s3 flex flex-wrap items-center justify-between gap-s3">
            <Segmented
              label="View"
              size="sm"
              className="pods-cal-view"
              value={view}
              onChange={(v) => setView(v)}
              options={[
                { value: "week", label: "Week" },
                { value: "month", label: "Month" },
              ]}
            />
            <div className="flex items-center gap-s1">
              <span className="tabular mr-s2 text-label font-medium text-ink">{period}</span>
              <button type="button" aria-label={`Previous ${view}`} onClick={() => step(-1)} className="pods-cal-nav pressable">
                <Icon name="back" size={18} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setAnchor(null);
                  setPicked(null);
                }}
                className="pods-cal-today pressable"
              >
                Today
              </button>
              <button type="button" aria-label={`Next ${view}`} onClick={() => step(1)} className="pods-cal-nav pressable">
                <Icon name="arrow" size={18} />
              </button>
            </div>
          </div>
          {view === "week" ? (
            <WeekRow start={weekStart(base)} today={today} sel={sel} byDay={byDay} hues={hues} onPick={setPicked} />
          ) : (
            <MonthGrid month={base} today={today} sel={sel} byDay={byDay} hues={hues} onPick={setPicked} />
          )}
          {view === "week" && <WeekList start={weekStart(base)} today={today} byDay={byDay} hues={hues} onPick={setPicked} sel={sel} />}
        </section>
        <aside className="pods-cal-day" aria-live="polite">
          <DayPanel day={sel} today={today} items={byDay[sel] ?? []} hues={hues} listClass={view === "week" ? "lg:hidden" : undefined} />
          {/* the whole feed, kept out of the header and below the day: a locked plan also adds itself from its own page */}
          <Button size="sm" variant="link" className="mt-s4" onClick={() => setShare(true)}>
            Sync with your calendar app
          </Button>
        </aside>
      </div>
      <SubscribeSheet open={share} onOpenChange={setShare} items={items} />
    </div>
  );
}

// ── grids ────────────────────────────────────────────────────────────────

interface GridProps {
  today: string;
  sel: string;
  byDay: Record<string, CalItem[]>;
  hues: Record<string, PodHueKey>;
  onPick: (k: string) => void;
}

function Dots({ items, hues }: { items: CalItem[]; hues: Record<string, PodHueKey> }) {
  if (!items.length) return <span className="pods-cal-dots" aria-hidden />;
  return (
    <span className="pods-cal-dots" aria-hidden>
      {items.slice(0, 3).map((i) => (
        <span key={i.id} className={cn("pods-cal-dot", i.kind !== "plan" && i.kind !== "hangout" && "is-task")} style={{ ["--dot" as string]: hueOf(hues, i.podId) }} />
      ))}
    </span>
  );
}

function dayLabel(k: string, items: CalItem[]) {
  return `${fmt(k, { weekday: "long", month: "long", day: "numeric" })}${items.length ? `, ${items.length} ${items.length === 1 ? "item" : "items"}` : ""}`;
}

export function WeekRow({ start, today, sel, byDay, hues, onPick }: GridProps & { start: string }) {
  return (
    <div className="pods-cal-week" role="group" aria-label="Week">
      {DOW.map((_, i) => {
        const k = addDays(start, i);
        const its = byDay[k] ?? [];
        const d = fmt(k, { weekday: "short" });
        return (
          <button
            key={k}
            type="button"
            aria-pressed={k === sel}
            aria-label={dayLabel(k, its)}
            onClick={() => onPick(k)}
            className={cn("pods-cal-cell pressable", k === today && "is-today", k === sel && "is-sel", k < today && "is-past")}
          >
            <span className="pods-cal-dow">{d}</span>
            <span className="pods-cal-num tabular">{Number(k.slice(8))}</span>
            <Dots items={its} hues={hues} />
          </button>
        );
      })}
    </div>
  );
}

function MonthGrid({ month, today, sel, byDay, hues, onPick }: GridProps & { month: string }) {
  const first = `${month.slice(0, 7)}-01`;
  const start = weekStart(first);
  const weeks = Math.ceil(((toDate(first).getUTCDay() + 6) % 7 + new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).getUTCDate()) / 7);
  return (
    <div className="pods-card overflow-hidden p-s2">
      <div className="pods-cal-month-head" aria-hidden>
        {DOW.map((d) => (
          <span key={d}>{d.slice(0, 1)}</span>
        ))}
      </div>
      <div className="pods-cal-month" role="group" aria-label={fmt(first, { month: "long", year: "numeric" })}>
        {Array.from({ length: weeks * 7 }, (_, i) => {
          const k = addDays(start, i);
          const its = byDay[k] ?? [];
          const out = k.slice(0, 7) !== first.slice(0, 7);
          return (
            <button
              key={k}
              type="button"
              aria-pressed={k === sel}
              aria-label={dayLabel(k, its)}
              onClick={() => onPick(k)}
              className={cn("pods-cal-mcell pressable", k === today && "is-today", k === sel && "is-sel", out && "is-out", k < today && "is-past")}
            >
              <span className="pods-cal-num tabular">{Number(k.slice(8))}</span>
              <Dots items={its} hues={hues} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Under the week row: the week's items in order, so the week reads at a glance without tapping. */
function WeekList({ start, today, byDay, hues, onPick, sel }: GridProps & { start: string }) {
  const days = DOW.map((_, i) => addDays(start, i)).filter((k) => (byDay[k] ?? []).length);
  if (!days.length) return <p className="mt-s4 text-[15px] text-ink-2">Nothing planned this week.</p>;
  return (
    <ol className="mt-s4 flex flex-col gap-s4 max-lg:hidden">
      {days.map((k) => (
        <li key={k}>
          <button type="button" onClick={() => onPick(k)} className={cn("pressable mb-s2 text-label font-medium", k === sel ? "text-ink" : "text-ink-2")}>
            {k === today ? "Today" : fmt(k, { weekday: "long", month: "short", day: "numeric" })}
          </button>
          <ItemList items={byDay[k] ?? []} hues={hues} />
        </li>
      ))}
    </ol>
  );
}

// ── one day ──────────────────────────────────────────────────────────────

export function ItemList({ items, hues, compact }: { items: CalItem[]; hues: Record<string, PodHueKey>; compact?: boolean }) {
  const db = useDb(useCallback((d) => d, []));
  const download = (i: CalItem) => {
    const target = db.hangouts[i.id] ?? db.suggestions[i.id];
    if (!target) return;
    const venueId = "venue_id" in target ? target.venue_id : null;
    downloadIcs(icsForPlan(target, venueId ? (db.venues[venueId] ?? null) : null, new Date().toISOString(), location.origin), icsFilename(i.title));
  };
  return (
    <ul className="pods-card divide-y divide-line overflow-hidden">
      {items.map((i) => (
        <li key={i.id} className="flex items-center">
          <Link href={i.href} className={cn("pods-cal-item pressable", compact && "is-compact")} style={{ ["--dot" as string]: hueOf(hues, i.podId) }}>
            <span className="pods-cal-bar" aria-hidden />
            <span className="tabular w-[52px] shrink-0 text-[14px] text-ink-2">{shortTime(i.starts_at)}</span>
            <span className="min-w-0 flex-1">
              <span className="block line-clamp-2 text-[16px] leading-[1.3] font-semibold text-ink">{i.title}</span>
              <span className="block truncate text-[14px] text-ink-2">
                {i.podName} · <span className={cn(i.needsYou && "font-medium text-ember-text")}>{i.line}</span>
              </span>
            </span>
          </Link>
          {/* only a locked hangout goes into your own calendar (sweep 10/29) */}
          {!compact && i.kind === "hangout" && (
            <button type="button" onClick={() => download(i)} aria-label={`Add ${i.title} to your calendar`} className="pods-cal-nav pressable mr-s3 shrink-0">
              <CalendarGlyph size={20} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function DayPanel({ day, today, items, hues, compact, listClass }: { day: string; today: string; items: CalItem[]; hues: Record<string, PodHueKey>; compact?: boolean; listClass?: string }) {
  const title = day === today ? "Today" : day === addDays(today, 1) ? "Tomorrow" : fmt(day, { weekday: "long", month: "short", day: "numeric" });
  return (
    <div className="flex flex-col gap-s4">
      {!compact && <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>}
      <div className={listClass}>{items.length ? <ItemList items={items} hues={hues} compact={compact} /> : !compact && <p className="text-[15px] text-ink-2">Nothing planned.</p>}</div>
      {day >= today && <YourTime day={day} today={today} />}
    </div>
  );
}

/** Your time on one date: three toggles. Tap flips free/busy for this date only; tapping back returns to your usual week. */
export function YourTime({ day, today }: { day: string; today: string }) {
  const me = useMe();
  if (!me) return null;
  const changed = DAY_PARTS.some((p) => exceptionAt(me, day, p));
  return (
    <div>
      <div className="mb-s2 flex items-baseline justify-between gap-s3">
        <h3 className="text-label font-medium text-ink">Your time {day === today ? "today" : fmt(day, { weekday: "long" })}</h3>
        <span className="text-[13px] text-ink-2">{changed ? "Changed for this day" : "Your usual week"}</span>
      </div>
      <div className="pods-cal-parts" role="group" aria-label="Free or busy">
        {DAY_PARTS.map((p) => {
          const free = isFree(me, day, p);
          const ex = exceptionAt(me, day, p);
          return (
            <button
              key={p}
              type="button"
              aria-pressed={free}
              onClick={() => setException(day, p, free ? "busy" : "free", today)}
              className={cn("pods-cal-part pressable", free ? "is-free" : "is-busy", ex && "is-changed")}
            >
              <span className="text-[13px] text-ink-2">{PART_LABEL[p]}</span>
              <span className="text-[15px] font-medium">{free ? "Free" : "Busy"}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-s2 text-[13px] leading-[1.4] text-ink-2">{me.rhythm === "changes" ? "Your week changes, so set it here. The AI checks it before it plans." : "Tap to change this day only. The AI plans around it."}</p>
    </div>
  );
}

// ── add to your calendar ─────────────────────────────────────────────────

function SubscribeSheet({ open, onOpenChange, items }: { open: boolean; onOpenChange: (o: boolean) => void; items: CalItem[] }) {
  const [copied, setCopied] = useState(false);
  const feed = typeof window === "undefined" ? "" : `${location.origin}/api/calendar/${encodeFeed(feedEvents(items))}.ics`;
  const links = feed ? subscribeLinks(feed) : null;
  const rows = links
    ? [
        { label: "Google Calendar", href: links.google },
        { label: "Apple Calendar", href: links.apple },
        { label: "Outlook", href: links.outlook },
      ]
    : [];
  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title="Add to your calendar" description="Your pods' plans and hangouts show up next to everything else." size="sm">
      <ul className="pods-card divide-y divide-line overflow-hidden">
        {rows.map((r) => (
          <li key={r.label}>
            <a href={r.href} target={r.href.startsWith("webcal") ? undefined : "_blank"} rel="noreferrer" className="pressable flex min-h-14 items-center justify-between gap-s3 px-s4 text-[16px] font-medium text-ink">
              {r.label}
              <Icon name="arrow" size={16} stroke={2} className="text-ink-2" />
            </a>
          </li>
        ))}
      </ul>
      <div className="mt-s4 flex flex-wrap gap-s2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            void navigator.clipboard?.writeText(feed).then(() => setCopied(true));
          }}
        >
          {copied ? "Link copied" : "Copy feed link"}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => feed && window.open(feed, "_blank")}>
          Download .ics
        </Button>
      </div>
    </ResponsiveSheet>
  );
}

/** Home's glance at the week: the next seven days, the picked day's items and your time that day. */
export function WeekGlance() {
  const { items, today, minute } = useCalendar();
  // hangouts ahead in the next 7 days (votes and finished hangouts don't count): "1 plan · Sat"
  const { line, next } = weekGlance(items, minute);
  const sel = next?.day ?? today;
  return (
    <div className="flex flex-col gap-s4">
      <Link href="/app/calendar" className="pods-card pressable flex min-h-14 items-center gap-s3 px-s4 outline-offset-2">
        <CalendarGlyph size={20} />
        <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{line}</span>
        <Icon name="arrow" size={16} className="text-ink-2" />
      </Link>
      {sel >= today && <YourTime day={sel} today={today} />}
    </div>
  );
}
