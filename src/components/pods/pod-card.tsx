// Pod summaries for Home and the Pods list (redesign): one card per pod with what you need to decide at a glance.
//   identity   the pod's orb (a dot per person, lit = said yes) · name · kind and size
//   status     one word chip: Needs you / You're in / Locked / Vote open / Check in / Opens after Sat
//   next       the plan: day, time · activity · place, with the in count
//   talk       the last line in the pod and how many are new
"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { shortDay, shortTime, type RoomTable } from "./model";
import { PodOrb } from "./pod-orb";

export type Tone = "spark" | "select" | "grove" | "quiet";

/** "Pickup basketball, rotating 5-on-5" → "Pickup basketball". */
export function activityWord(event: string) {
  // cut at a word, never mid-word (founder r1029)
  const w = event.split(/[,:;(—–]/)[0].trim();
  if (w.length <= 28) return w;
  const cut = w.slice(0, 28);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 12)).trimEnd()}…`;
}

/** The pod's state in one or two words, and how loud it is. */
export function statusOf(t: RoomTable, closed: string): { word: string; tone: Tone } | null {
  if (!t.open) return { word: closed, tone: "quiet" };
  switch (t.row.status) {
    case "needs_rsvp":
      return { word: "Needs you", tone: "spark" };
    case "vote_open":
      return { word: "Vote open", tone: "spark" };
    case "checkin_due":
      return { word: "Check in", tone: "spark" };
    case "run_it_back":
      return { word: "Run it back?", tone: "spark" };
    case "happening_now":
      return { word: "Now", tone: "grove" };
    case "today":
      return { word: "Today", tone: "select" };
    case "youre_in":
      return { word: "You're in", tone: "select" };
    case "locked":
      return { word: "Locked", tone: "select" };
    case "forming":
      return { word: "Filling", tone: "quiet" };
    case "pending_review":
    case "generating":
      return { word: "Planning", tone: "quiet" };
    default:
      return null;
  }
}

export function needsYou(t: RoomTable) {
  return t.open && ["needs_rsvp", "vote_open", "checkin_due", "run_it_back"].includes(t.row.status);
}

const CHIP: Record<Tone, string> = {
  spark: "bg-[color-mix(in_oklab,var(--spark)_16%,var(--lit))] text-ink",
  select: "bg-[color-mix(in_oklab,var(--select)_12%,var(--lit))] text-select",
  grove: "bg-[color-mix(in_oklab,var(--color-grove)_18%,var(--lit))] text-grove-text",
  quiet: "bg-sunken text-ink-2",
};

export function StatusChip({ word, tone, className }: { word: string; tone: Tone; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-[13px] leading-none font-medium whitespace-nowrap", CHIP[tone], className)}>
      {tone === "spark" && <span aria-hidden className="size-1.5 rounded-full bg-spark" />}
      {word}
    </span>
  );
}

/** "Sat 10am · Pickup basketball" and "Brahan Spring Park · Free". */
export function planLines(t: RoomTable, minute: number): { when: string; what: string; where: string } | null {
  const p = t.row.plan;
  if (!p || p.s.status === "pending_review") return null;
  const place = p.venue ? (p.venue.short_name ?? p.venue.name) : "";
  const cost = (p.s.plan_json.cost ?? "").trim();
  return {
    when: `${shortDay(p.startsAt, minute)} · ${shortTime(p.startsAt)}`,
    what: activityWord(p.s.plan_json.event || p.s.summary),
    where: [place, cost].filter(Boolean).join(" · "),
  };
}

export function kindLine(t: RoomTable) {
  return `${t.row.pod.type === "community" ? "Community" : "Interest"} · ${t.row.size} people`;
}

/** The full card (Pods list). */
/** `widened` is accepted for older callers and ignored: beat 3's line lives at placing and in the pod's details only. */
export function PodCard({ t, minute, closed, unread }: { t: RoomTable; minute: number; closed: string; unread: number; widened?: string | null }) {
  const st = statusOf(t, closed);
  const plan = planLines(t, minute);
  const going = t.row.plan?.going.length ?? 0;
  const href = `/app/pods/${t.row.pod.id}`;
  const body = (
    <>
      <div className="flex items-start gap-s3">
        <PodOrb hue={t.hue} people={t.row.size} inCount={going} size={52} open={t.open} />
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center justify-between gap-s2">
            <h2 className="line-clamp-2 text-[18px] leading-[1.2] font-semibold tracking-[-0.01em] text-ink">{t.row.name}</h2>
            {st && <StatusChip {...st} />}
          </div>
          <p className="mt-0.5 text-label text-ink-2">{kindLine(t)}</p>
        </div>
      </div>
      {t.open ? (
        <>
          <div className="mt-s4 flex items-center gap-s3 rounded-[14px] bg-sunken px-s3 py-s3">
            <Icon name="day" size={20} className="shrink-0 text-select" />
            {plan ? (
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-[15px] font-semibold text-ink">
                  {plan.when} · {plan.what}
                </span>
                <span className="block truncate text-[14px] text-ink-2">{plan.where}</span>
              </span>
            ) : (
              <span className="flex-1 text-[15px] text-ink-2">The AI is planning the next one</span>
            )}
            {plan && t.row.plan && (
              <span className="tabular shrink-0 text-[14px] font-semibold text-ink">
                {going}/{t.row.size} in
              </span>
            )}
          </div>
          {t.row.lastLine && (
            <div className="mt-s3 flex items-center gap-s2 text-[14px]">
              <Icon name="talk" size={18} className="shrink-0 text-ink-2" />
              <span className={cn("min-w-0 flex-1 truncate", unread ? "font-medium text-ink" : "text-ink-2")}>{t.row.lastLine}</span>
              {unread > 0 && <span className="tabular grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-select px-1.5 text-[12px] font-semibold text-on-select">{unread}</span>}
            </div>
          )}
        </>
      ) : null}
    </>
  );
  // an on-deck pod opens too: its page is read-only until it opens (one pod at a time)
  const cls = "pods-card block p-s4 lg:p-s6";
  return (
    <Link href={href} className={cn(cls, "pressable outline-offset-2 hover:shadow-[0_0_0_1px_var(--line-2),0_6px_20px_-12px_rgb(0_0_0/.18)]")}>
      {body}
    </Link>
  );
}

/** The compact row (Home, "Your pods"). */
export function PodRow({ t, minute, closed, unread }: { t: RoomTable; minute: number; closed: string; unread: number }) {
  const st = statusOf(t, closed);
  const plan = planLines(t, minute);
  const going = t.row.plan?.going.length ?? 0;
  const sub = !t.open ? kindLine(t) : plan ? `${plan.when} · ${plan.what}` : (t.row.lastLine ?? "Planning");
  const inner = (
    <>
      <PodOrb hue={t.hue} people={t.row.size} inCount={going} size={40} open={t.open} needs={needsYou(t)} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-s2">
          <span className="truncate text-[16px] font-semibold text-ink">{t.row.name}</span>
          {unread > 0 && <span className="tabular grid h-5 min-w-5 place-items-center rounded-full bg-select px-1.5 text-[12px] font-semibold text-on-select">{unread}</span>}
        </span>
        <span className="block truncate text-[14px] text-ink-2">{sub}</span>
      </span>
      {st && <StatusChip {...st} className={t.open ? "max-sm:hidden" : undefined} />}
      <Icon name="arrow" size={16} stroke={2} className="shrink-0 text-ink-2" />
    </>
  );
  const cls = "flex min-h-16 items-center gap-s3 px-s4 py-s2";
  return (
    <Link href={`/app/pods/${t.row.pod.id}`} className={cn(cls, "pressable outline-offset-[-2px] hover:bg-[color-mix(in_srgb,var(--ink)_3%,transparent)]")}>
      {inner}
    </Link>
  );
}
