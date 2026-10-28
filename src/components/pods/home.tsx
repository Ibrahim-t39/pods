// Home: the adaptive front (PLATFORM_SPEC §F1; MOTION_SYSTEM §6, §12 "Now"). It leads with the one thing that matters
// now (lib/journey/moment.ts), then your pods as glass orbs, then at most two quiet rows.
//   head    overline (the moment) + one bold line: "Hoopers, Saturday 10am."
//   lead    deciding / locked / now: the plan card in its halo (beat 4: the AI's first plan for the pod)
//           after: "Run it back?" · vote: "Pick a time" · quiet: the next fit · filling: "Your pod is filling."
//   pods    two columns of orbs, Interests and Community (beat 2), the widened line on its pod (beat 3)
//   needs   a pod that waits on you wears a small spark on its orb; new in Inbox is one quiet row
// Phone: one column under the chrome, clears the capsule. Laptop: head + lead on the left, your pods on the right.
"use client";

import Link from "next/link";
import { useCallback } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CirclesLoader, DiscStack, GENTLE, InCount, Line, PlanHalo, SNAPPY, STAGGER, Shared, Stage, WidenGlyph, sharedName } from "@/components/brand";
import { POD_SOLID, POD_WASH } from "@/components/brand/disc";
import { Icon } from "@/components/icons";
import { Chrome } from "@/components/shell";
import { SearchGlyph } from "@/components/shell/nav-glyphs";
import { useDb, useHydrated, useMe } from "@/lib/db/hooks";
import { useMoment } from "@/lib/journey/use-moment";
import { cardView } from "@/lib/planner/card-state";
import { unreadCount } from "@/lib/platform/selectors";
import { useClock } from "@/lib/time/clock";
import { dayWord, firstName, nextLine, opensAfter, roomTables, shortTime, tableState, type RoomTable } from "./model";
import { sourceLine } from "./table-stage";
import "./pods.css";

const OVERLINE: Record<string, string> = {
  deciding: "Next",
  locked: "Locked",
  now: "Today",
  after: "Last time",
  vote: "Round two",
  planning: "Planning",
  filling: "Almost",
  quiet: "Your pods",
  first_run: "Your pods",
};

/** "Pickup basketball, rotating 5-on-5" → "Pickup basketball". */
function activityWord(event: string) {
  const w = event.split(/[,:;(—–]/)[0].trim();
  return w.length > 28 ? `${w.slice(0, 27).trimEnd()}…` : w;
}

function widenLine(body: string | undefined, from: string): string {
  const m = body?.match(/Only (\d+) (\S+)/);
  return m ? `Only ${m[1]} ${m[2]} nearby` : `Not many ${from}s nearby`;
}

export function Home() {
  const hydrated = useHydrated();
  const now = useClock();
  const minute = Math.floor(now.getTime() / 60_000) * 60_000;
  const tables = useDb(useCallback((db) => roomTables(db, minute), [minute]));
  const moment = useMoment();
  const unread = useDb(unreadCount);
  const widened = useDb(
    useCallback((db) => {
      const pod = Object.values(db.pods).find((p) => p.widened_from?.kind === "group" && db.memberships.some((m) => m.pod_id === p.id && m.user_id === db.me && !m.left_at));
      if (!pod?.widened_from) return null;
      const entry = (db.plannerCache as Record<string, { output?: unknown }>)[`${pod.id}:widen_explainer`];
      const body = (entry?.output as { body?: string } | undefined)?.body;
      return { podId: pod.id, line: `${widenLine(body, pod.widened_from.from)}. Widened to ${pod.widened_from.to}.` };
    }, []),
  );

  if (!hydrated) {
    return (
      <div className="grid h-[100dvh] place-items-center">
        <CirclesLoader label="Loading your pods" size={96} />
      </div>
    );
  }

  const open = tables.filter((t) => t.open);
  const lead = open.find((t) => t.row.pod.id === moment.leadPodId) ?? open[0];
  const line = nextLine(lead, minute);
  // pods other than the lead that wait on you wear a small spark on their orb (no extra rows: the orb is the row)
  const needs = new Set(open.filter((t) => t !== lead && ["needs_rsvp", "vote_open", "checkin_due", "run_it_back"].includes(t.row.status)).map((t) => t.row.pod.id));

  const head = (
    <>
      <p className="text-overline text-ink-2">{OVERLINE[moment.moment] ?? "Next"}</p>
      <Line className="mt-s2 max-w-[13ch]">{line ?? (tables.length ? "Your pods." : "Your pod is filling.")}</Line>
    </>
  );

  return (
    <>
      <Stage light={moment.light} />
      <div className="pods-home">
        <Chrome
          left="mark"
          right={
            <Link href="/app/search" aria-label="Search" className="pressable inline-flex size-11 items-center justify-center rounded-full outline-offset-2 lg:hidden">
              <SearchGlyph />
            </Link>
          }
        />
        <div className="pods-home-body">
          <section className="pods-home-lead" aria-label="Next">
            {head}
            {lead && <Lead table={lead} minute={minute} moment={moment.moment} />}
          </section>
          {tables.length > 0 && <PodOrbs tables={tables} minute={minute} widened={widened} needs={needs} />}
          {unread > 0 && (
            <Link href="/app/inbox" className="pods-home-inbox pressable flex min-h-14 items-center gap-s3 border-y border-line outline-offset-[-2px]">
              <span aria-hidden className="tabular grid size-8 shrink-0 place-items-center rounded-full bg-spark text-[13px] font-semibold text-on-spark" style={{ backgroundImage: "var(--bead)" }}>
                {unread}
              </span>
              <span className="flex-1 text-[17px] font-semibold text-ink">Inbox</span>
              <span className="text-label text-ink-2">new</span>
              <Icon name="arrow" size={20} className="text-ink-2" />
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

// ── the lead object ─────────────────────────────────────────────────────

function Lead({ table, minute, moment }: { table: RoomTable; minute: number; moment: string }) {
  const podId = table.row.pod.id;
  const view = useDb(useCallback((db) => cardView(db, podId, minute), [podId, minute]));
  const people = useDb(
    useCallback((db) => (view?.going ?? []).map((id) => ({ id, you: id === db.me, name: id === db.me ? (db.users[id]?.first_name ?? "") : firstName(db, id) })), [view?.going]),
  );
  const href = `/app/pods/${podId}`;
  const name = table.row.name;

  // the repeat loop and votes: one big go, the pod's table does the rest
  if (moment === "after" || moment === "vote" || !view?.suggestion) {
    const label = table.row.status === "checkin_due" ? `Check in to ${name}` : moment === "filling" ? "Your pod" : `Open ${name}`;
    return (
      <Link href={href} className="pressable pods-home-go mt-s8 flex min-h-[72px] items-center gap-s4 outline-offset-4">
        <span aria-hidden className="orb size-14 shrink-0" style={{ ["--orb" as string]: POD_SOLID[table.hue], ["--orb-wash" as string]: POD_WASH[table.hue] }} />
        <span className="flex-1 text-[20px] font-semibold tracking-[-0.02em] text-ink">{label}</span>
        <Icon name="arrow" size={24} />
      </Link>
    );
  }

  const s = view.suggestion;
  const startsAt = view.hangout?.starts_at ?? s.plan_json.starts_at;
  const placeName = view.venue ? (view.venue.short_name ?? view.venue.name) : null;
  const cost = (s.plan_json.cost ?? "").trim();
  const activity = activityWord(s.plan_json.event || s.summary);
  const day = dayWord(startsAt, minute);

  return (
    <Shared name={sharedName.plan(s.id)}>
      <PlanHalo state={view.locked ? "locked" : "waiting"} radius={28} className="mt-s8 w-full max-w-[440px]">
        <Link
          href={href}
          aria-label={`${name}: ${activity}, ${day} ${shortTime(startsAt)}${placeName ? `, ${placeName}` : ""}. ${view.going.length} of ${view.size} in. Open ${name}.`}
          className="pressable glass block rounded-[28px] px-s6 pt-s6 pb-s4 outline-offset-4"
        >
          <span className="block text-[17px] leading-[1.3] font-semibold text-ink">{activity}</span>
          <span className="block text-[17px] leading-[1.3] text-ink-2">{[placeName, cost].filter(Boolean).join(" · ")}</span>
          <span className="mt-s6 flex min-h-[30px] items-center gap-s3">
            {people.length > 0 ? (
              <>
                <DiscStack size={30} max={4} people={people.map((p) => ({ initial: p.name.slice(0, 1).toUpperCase(), tone: p.you ? "you" : table.hue, seed: p.name }))} />
                <InCount n={view.going.length} of={view.size} locked={view.locked} className="text-[15px] text-ink" />
              </>
            ) : (
              <span className="text-[15px] font-semibold text-ink">Be the first in</span>
            )}
          </span>
          <span className="mt-s4 flex items-center gap-s2 border-t border-line pt-s3 text-label text-ink-2">
            <Icon name="why" size={18} className="text-select" />
            <span className="flex-1">{sourceLine(s.source)}</span>
            <Icon name="arrow" size={20} className="text-ink" />
          </span>
        </Link>
      </PlanHalo>
    </Shared>
  );
}

// ── your pods as orbs ───────────────────────────────────────────────────

function PodOrbs({ tables, minute, widened, needs }: { tables: RoomTable[]; minute: number; widened: { podId: string; line: string } | null; needs: Set<string> }) {
  const reduce = useReducedMotion();
  const me = useMe();
  const groups = [
    { key: "interest", label: "Interests", list: tables.filter((t) => t.row.pod.type !== "community") },
    { key: "community", label: "Community", list: tables.filter((t) => t.row.pod.type === "community") },
  ].filter((g) => g.list.length);
  let i = 0;
  const closed = opensAfter(tables, minute);
  return (
    <section className="pods-home-pods" aria-label="Your pods">
      {groups.map((g) => (
        <div key={g.key} className="min-w-0">
          <h2 className="text-overline text-ink-2">{g.label}</h2>
          <ul className="mt-s4 grid grid-cols-2 gap-s4 lg:gap-s6">
            {g.list.map((t) => {
              const k = i++;
              const H = POD_SOLID[t.hue];
              const dots = Math.min(10, t.people.length + 1);
              const body = (
                <>
                  <Shared name={sharedName.pod(t.row.pod.id)}>
                    <motion.span
                      aria-hidden
                      data-depth={Math.min(3, Math.max(1, t.held + 1))}
                      className="pods-home-orb orb relative block shrink-0"
                      style={{ ["--orb" as string]: H, ["--orb-wash" as string]: POD_WASH[t.hue]}}
                      initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: t.open ? 1 : 0.5 }}
                      transition={{ ...SNAPPY, delay: 0.1 + k * STAGGER * 2 }}
                    >
                      {/* the people: white dots inside the bubble, you in ember (the dot is the person, BRAND §1) */}
                      {Array.from({ length: dots }, (_, d) => {
                        const a = -Math.PI / 2 + (d / dots) * Math.PI * 2;
                        const you = d === 0;
                        return (
                          <span
                            key={d}
                            data-nc
                            className="absolute rounded-full"
                            style={{
                              width: you ? "15%" : "9%",
                              height: you ? "15%" : "9%",
                              left: `${50 + Math.cos(a) * 30}%`,
                              top: `${50 + Math.sin(a) * 30}%`,
                              transform: "translate(-50%,-50%)",
                              color: you ? "var(--on-you)" : undefined,
                              backgroundColor: you ? "var(--you)" : t.people[d - 1]?.in ? "var(--lit)" : "color-mix(in srgb, var(--lit) 55%, transparent)",
                              backgroundImage: "var(--bead)",
                              boxShadow: you ? "var(--shadow-bead)" : "0 1px 2px rgb(0 0 0 / .12)",
                            }}
                          >
                            {you && me ? <span className="sr-only">You</span> : null}
                          </span>
                        );
                      })}
                      {needs.has(t.row.pod.id) && (
                        <span className="absolute top-[4%] right-[4%] size-[18%] rounded-full bg-spark shadow-[0_0_0_2px_var(--lit)]" style={{ backgroundImage: "var(--bead)" }}>
                          <span className="sr-only">Needs you</span>
                        </span>
                      )}
                    </motion.span>
                  </Shared>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] leading-[1.2] font-semibold tracking-[-0.01em] text-ink [text-wrap:balance]">{t.row.name}</span>
                    <span className="mt-1 block text-label text-ink-2">{tableState(t, minute, closed)}</span>
                  </span>
                </>
              );
              return (
                <li key={t.row.pod.id}>
                  {t.open ? (
                    <Link href={`/app/pods/${t.row.pod.id}`} className="pressable flex flex-col items-start gap-s3 rounded-[28px] outline-offset-4 lg:flex-row lg:items-center lg:gap-s4">
                      {body}
                    </Link>
                  ) : (
                    <div className="flex flex-col items-start gap-s3 opacity-80 lg:flex-row lg:items-center lg:gap-s4">{body}</div>
                  )}
                  {widened?.podId === t.row.pod.id && (
                      <motion.span
                        className="glass mt-s2 flex items-start gap-s1 rounded-[14px] px-s3 py-s2 text-[13px] leading-[1.3] text-ink"
                        data-widened-note
                        initial={reduce ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...GENTLE, delay: 0.8 }}
                      >
                        <WidenGlyph size={16} className="mt-px shrink-0 text-grove-text" />
                        <span>{widened.line}</span>
                      </motion.span>
                    )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <Link href="/app/discover" className="pods-home-more pressable flex min-h-11 items-center gap-s2 text-label font-semibold text-ink outline-offset-4">
        <Icon name="add" size={20} /> More pods
      </Link>
    </section>
  );
}
