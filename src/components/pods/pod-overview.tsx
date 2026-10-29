// The pod page's frame (redesign): identity on top, then the plan (pod-table + table-stage), then what the pod is:
// members, Talk, memories and its settings, all reachable on the page instead of hidden behind the menu.
"use client";

import Link from "next/link";
import { useCallback, type ReactNode } from "react";
import { Disc, DiscStack, WidenGlyph, type PodHueKey } from "@/components/brand";
import { Icon, type IconName } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import { useDb } from "@/lib/db/hooks";
import { podMembers } from "@/lib/db/selectors";
import { podMemories } from "@/lib/platform/selectors";
import { useClock } from "@/lib/time/clock";
import { formatRelative } from "@/lib/time/format";
import { cn } from "@/lib/cn";
import { firstName } from "./model";
import type { PodSheet } from "./pod-menu";
import { PodOrb } from "./pod-orb";

export function PodIdentity({ podId, name, hue, kind, going, held, actions }: { podId: string; name: string; hue: PodHueKey; kind: string; going: number; held: number; actions?: ReactNode }) {
  const size = useDb(useCallback((db) => podMembers(db, podId).length, [podId]));
  // beat 3: a community pod widened from a smaller group says so, once, under its name
  const widened = useDb(
    useCallback((db) => {
      const w = db.pods[podId]?.widened_from;
      if (!w || w.kind !== "group") return null;
      const entry = (db.plannerCache as Record<string, { output?: unknown }>)[`${podId}:widen_explainer`];
      const m = ((entry?.output as { body?: string } | undefined)?.body ?? "").match(/Only (\d+) (\S+)/);
      return `${m ? `Only ${m[1]} ${m[2]} nearby` : `Not many ${w.from}s nearby`}. Widened to ${w.to}.`;
    }, [podId]),
  );
  return (
    <div>
      <div className="flex items-center gap-s3">
        <PodOrb hue={hue} people={size} inCount={going} size={48} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[24px] leading-[1.15] font-semibold tracking-[-0.02em] text-ink lg:text-[28px]">{name}</h1>
          <p className="text-label text-ink-2">
            {kind} · {size} people{held > 0 ? ` · ${held} ${held === 1 ? "hangout" : "hangouts"}` : ""}
          </p>
        </div>
        {actions}
      </div>
      {widened && (
        <p className="mt-s3 flex items-start gap-s2 text-[14px] leading-[1.35] text-ink-2">
          <WidenGlyph size={16} className="mt-0.5 shrink-0 text-grove-text" />
          <span>{widened}</span>
        </p>
      )}
    </div>
  );
}

function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0", className)}>
      <div className="mb-s3 flex min-h-6 items-center justify-between gap-s4">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const linkCls = "pressable inline-flex min-h-11 items-center text-label font-semibold text-select outline-offset-2";

export function PodSections({
  podId,
  hue,
  name,
  docked,
  unread,
  muted,
  onMute,
  onSheet,
  onTalk,
}: {
  podId: string;
  hue: PodHueKey;
  name: string;
  docked: boolean;
  unread: number;
  muted: boolean;
  onMute: () => void;
  onSheet: (s: PodSheet) => void;
  onTalk: () => void;
}) {
  const now = useClock(60_000);
  const members = useDb(
    useCallback(
      (db) =>
        podMembers(db, podId)
          .map((m) => ({ id: m.user_id, you: m.user_id === db.me, name: m.user_id === db.me ? (db.users[m.user_id]?.first_name ?? "You") : firstName(db, m.user_id) }))
          .sort((a, b) => Number(b.you) - Number(a.you)),
      [podId],
    ),
  );
  const talk = useDb(
    useCallback(
      (db) =>
        (db.messages[podId] ?? [])
          .filter((m) => m.kind === "text" && m.user_id)
          .slice(-3)
          .map((m) => ({ id: m.id, you: m.user_id === db.me, who: firstName(db, m.user_id), text: m.text, at: m.created_at })),
      [podId],
    ),
  );
  const memories = useDb(useCallback((db) => podMemories(db, podId).slice(0, 2).map((m) => ({ ...m, by: m.user_id === db.me ? "You" : firstName(db, m.user_id) })), [podId]));
  const memoryCount = useDb(useCallback((db) => podMemories(db, podId).length, [podId]));

  return (
    <div className="pods-pod-more">
      {!docked && (
        <Section
          title="Talk"
          action={
            <button type="button" onClick={onTalk} className={linkCls}>
              {unread > 0 ? `${unread} new` : "Open"}
            </button>
          }
        >
          <button type="button" onClick={onTalk} className="pods-card pressable block w-full p-s4 text-left outline-offset-2" aria-label={`Open ${name} talk`}>
            {talk.length ? (
              <ul className="flex flex-col gap-s3">
                {talk.map((m) => (
                  <li key={m.id} className="flex items-start gap-s2">
                    <Disc initial={m.who.slice(0, 1).toUpperCase()} tone={m.you ? "you" : hue} seed={m.who} size={28} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-s2 text-[13px] text-ink-2">
                        <span className="font-semibold text-ink">{m.you ? "You" : m.who}</span>
                        {formatRelative(m.at, now)}
                      </span>
                      <span className="line-clamp-2 block text-[15px] leading-[1.35] text-ink">{m.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-[15px] text-ink-2">No messages yet. Say hi to the pod.</span>
            )}
            <span className="mt-s3 flex h-11 items-center rounded-full bg-sunken px-s4 text-[15px] text-ink-2">Message {name}</span>
          </button>
        </Section>
      )}

      <Section title="Members" action={<button type="button" onClick={() => onSheet("members")} className={linkCls}>See all {members.length}</button>}>
        <button type="button" onClick={() => onSheet("members")} className="pods-card pressable flex w-full items-center gap-s3 p-s4 text-left outline-offset-2">
          {/* founder r1029: the discs and the names are the same people, in the same order ("You" first) */}
          <DiscStack size={32} max={4} people={members.map((m) => ({ initial: m.name.slice(0, 1).toUpperCase(), tone: m.you ? "you" : hue, seed: m.name, label: m.you ? "You" : m.name }))} />
          <span className="min-w-0 flex-1 truncate text-[14px] text-ink-2">
            {members
              .slice(0, 4)
              .map((m) => (m.you ? "You" : m.name))
              .join(", ")}
          </span>
        </button>
      </Section>

      <Section title="Memories" action={<button type="button" onClick={() => onSheet("memories")} className={linkCls}>{memoryCount > 2 ? `See all ${memoryCount}` : "Add"}</button>}>
        <button type="button" onClick={() => onSheet("memories")} className="pods-card pressable block w-full p-s4 text-left outline-offset-2">
          {memories.length ? (
            <ul className="flex flex-col gap-s3">
              {memories.map((m) => (
                <li key={m.id} className="flex items-start gap-s3">
                  {m.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- local data URL
                    <img src={m.photo_url} alt="" className="size-12 shrink-0 rounded-[10px] object-cover" />
                  ) : (
                    <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-[10px] bg-sunken text-ink-2">
                      <Icon name="edit" size={20} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 block text-[15px] leading-[1.35] text-ink">{m.caption || "A photo from the day"}</span>
                    <span className="text-[13px] text-ink-2">
                      {m.by} · {formatRelative(m.created_at, now)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="flex items-center gap-s3">
              <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-[10px] bg-sunken text-ink-2">
                <Icon name="edit" size={20} />
              </span>
              <span className="text-[15px] leading-[1.35] text-ink-2">After a hangout, keep a line or a photo from the day here.</span>
            </span>
          )}
        </button>
      </Section>

      <Section title="Pod settings">
        <div className="pods-card divide-y divide-line overflow-hidden">
          <SettingRow icon="add" label="Invite a friend" href={`/app/invite?pod=${podId}`} />
          <SettingRow
            icon="bell"
            label="Mute this pod"
            onClick={onMute}
            pressed={muted}
            end={
              <span aria-hidden className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", muted ? "bg-select" : "bg-line-2")}>
                <span className={cn("absolute top-0.5 size-6 rounded-full bg-lit shadow transition-transform", muted ? "translate-x-[22px]" : "translate-x-0.5")} />
              </span>
            }
          />
          <SettingRow icon="flag" label="Report someone" onClick={() => onSheet("report")} />
          <SettingRow icon="block" label={`Leave ${name}`} onClick={() => onSheet("leave")} />
        </div>
      </Section>
    </div>
  );
}

function SettingRow({ icon, label, href, onClick, end, pressed }: { icon: IconName; label: string; href?: string; onClick?: () => void; end?: ReactNode; pressed?: boolean }) {
  const cls = "pressable flex min-h-13 w-full items-center gap-s3 px-s4 py-s3 text-left text-[15px] text-ink outline-offset-[-2px] hover:bg-[color-mix(in_srgb,var(--ink)_3%,transparent)]";
  const body = (
    <>
      <Icon name={icon} size={20} className="shrink-0 text-ink-2" />
      <span className="flex-1">{label}</span>
      {end ?? <Icon name="arrow" size={16} stroke={2} className="text-ink-2" />}
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" className={cls} onClick={onClick} aria-pressed={pressed}>
      {body}
    </button>
  );
}

export const smallBtn = buttonVariants({ variant: "secondary", size: "sm" });
