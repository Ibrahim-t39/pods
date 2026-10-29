// The chat as its own page on a laptop (/app/pods/[id]/chat, ≥1024px): the thread in the centre, what the pod is
// doing beside it (WhatsApp Web's group panel, Slack's channel details). Phones keep the full-screen thread
// (talk-sheet.tsx TalkSheet), so this renders nothing below 1024px.
//   centre  header (back to the pod · name · who is here) · thread · composer, all on a 760px reading column
//   aside   the next hangout with its one action (I'm in / Locked / Check in), what to bring, the rain backup ·
//           members (who is in) · shared photos
"use client";

import "./chat-room.css";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { personColor, YOU_COLOR } from "@/components/brand/disc";
import { Icon } from "@/components/icons";
import { notify } from "@/components/ui/toast";
import { usePlanActions } from "@/components/planner/use-plan-actions";
import { cn } from "@/lib/cn";
import { useDb, useHydrated, useRepo } from "@/lib/db/hooks";
import { membership, podMembers } from "@/lib/db/selectors";
import { cardView, type CardView } from "@/lib/planner/card-state";
import { useClock } from "@/lib/time/clock";
import { dayWord, firstName, roomTables, shortTime } from "./model";
import { TalkBody, useChatPage } from "./talk-sheet";

export function ChatRoom({ podId }: { podId: string }) {
  const hydrated = useHydrated();
  const page = useChatPage();
  if (!hydrated || !page) return null;
  return <ChatRoomInner podId={podId} />;
}

function ChatRoomInner({ podId }: { podId: string }) {
  const router = useRouter();
  const now = useClock();
  const minute = Math.floor(now.getTime() / 60_000) * 60_000;
  const tables = useDb(useCallback((db) => roomTables(db, minute), [minute]));
  const mine = useDb((db) => membership(db, podId));
  const here = tables.find((t) => t.row.pod.id === podId);
  // the table under this page walks between pods on ←/→; in the chat those keys belong to the text, not the walk
  useEffect(() => {
    const k = (e: KeyboardEvent) => (e.key === "ArrowLeft" || e.key === "ArrowRight") && e.stopImmediatePropagation();
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, []);
  if (!mine || !here) return null;
  const name = here.row.name;
  return (
    <div data-chat-room className="pods-chat-room">
      <section aria-label={`${name} chat`} className="flex min-h-0 min-w-0 flex-col">
        <TalkBody open onOpenChange={() => router.push(`/app/pods/${podId}`)} podId={podId} podName={name} hue={here.hue} where="page" onMembers={() => router.push(`/app/pods/${podId}/members`)} />
      </section>
      <PodAside podId={podId} minute={minute} />
    </div>
  );
}

// ── the aside ────────────────────────────────────────────────────────────────────────────────────────────

function Face({ name, you, size = 32 }: { name: string; you?: boolean; size?: number }) {
  const c = you ? YOU_COLOR : personColor(name);
  return (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full font-semibold leading-none select-none" style={{ width: size, height: size, background: c.bg, color: c.fg, fontSize: Math.round(size * 0.44) }}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-b border-line px-s6 py-s6 last:border-b-0">
      <h2 className="mb-s3 flex items-center justify-between text-[13px] font-semibold tracking-[0.02em] text-ink-2">
        {title}
        {action}
      </h2>
      {children}
    </section>
  );
}

function PodAside({ podId, minute }: { podId: string; minute: number }) {
  const view = useDb(useCallback((db) => cardView(db, podId, minute), [podId, minute]));
  const people = useDb(
    useCallback(
      (db) =>
        podMembers(db, podId)
          .map((m) => ({ id: m.user_id, name: m.user_id === db.me ? (db.users[m.user_id]?.first_name ?? "You") : firstName(db, m.user_id), you: m.user_id === db.me, pronouns: db.users[m.user_id]?.pronouns ?? null }))
          .sort((a, b) => Number(b.you) - Number(a.you) || a.name.localeCompare(b.name)),
      [podId],
    ),
  );
  const photos = useDb(useCallback((db) => Object.values(db.memories).filter((x) => x.pod_id === podId && x.photo_url && !x.removed_at).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6), [podId]));
  const going = new Set(view?.going ?? []);
  const sorted = [...people].sort((a, b) => Number(b.you) - Number(a.you) || Number(going.has(b.id)) - Number(going.has(a.id)));

  return (
    <aside aria-label="About this pod" className="min-h-0 overflow-y-auto border-l border-line bg-lit">
      {view && <NextPlan view={view} podId={podId} minute={minute} />}
      <Section
        title={`Members · ${people.length}`}
        action={
          <Link href={`/app/pods/${podId}/members`} className="pressable text-[13px] font-semibold text-select hover:underline">
            See all
          </Link>
        }
      >
        <ul className="flex flex-col">
          {sorted.map((p) => (
            <li key={p.id} className="flex min-h-11 items-center gap-s3">
              <Face name={p.name} you={p.you} />
              <span className="min-w-0 flex-1 truncate text-[15px] text-ink">
                {p.you ? "You" : p.name}
                {p.pronouns && <span className="ml-s2 text-[13px] text-ink-3">{p.pronouns}</span>}
              </span>
              {going.has(p.id) && <span className="text-[12px] font-semibold text-grove-text">In</span>}
            </li>
          ))}
        </ul>
      </Section>
      {photos.length > 0 && (
        <Section title="Photos">
          <div className="grid grid-cols-3 gap-s2">
            {photos.map((m) => (
              // eslint-disable-next-line @next/next/no-img-element -- local data URLs
              <img key={m.id} src={m.photo_url!} alt={m.caption || "Pod photo"} className="aspect-square w-full rounded-[12px] object-cover" />
            ))}
          </div>
        </Section>
      )}
    </aside>
  );
}

const LOOP = new Set(["check_in", "ballot", "waiting_reveal", "planning_next", "missed"]);

function NextPlan({ view, podId, minute }: { view: CardView; podId: string; minute: number }) {
  const repo = useRepo();
  const actions = usePlanActions(podId);
  const [busy, setBusy] = useState(false);
  const plan = view.suggestion?.plan_json;
  const when = view.hangout?.starts_at ?? plan?.starts_at;
  const venue = view.venue;
  const title = plan?.event.split(/[,:;(—–]/)[0].trim() ?? view.hangout?.title ?? null;
  const href = view.suggestion && !LOOP.has(view.phase) ? `/app/pods/${podId}/plan/${view.suggestion.id}` : `/app/pods/${podId}`;
  const btn = "pressable flex h-11 w-full items-center justify-center gap-s2 rounded-full text-[15px] font-semibold disabled:opacity-40";

  if (view.phase === "empty" || !title) {
    return (
      <Section title="Next hangout">
        <p className="text-[15px] leading-[1.4] text-ink-2">Nothing planned yet. The AI picks a time and place that works for most of you.</p>
        <button type="button" disabled={actions.busy || actions.genKind !== null} onClick={() => void actions.planNow()} className={cn(btn, "mt-s4 bg-ink text-lit")}>
          Ask AI for a plan
        </button>
      </Section>
    );
  }

  let action: React.ReactNode;
  switch (view.phase) {
    case "check_in":
      action = view.checkedIn ? (
        <p className="flex h-11 items-center justify-center gap-s1 text-[15px] font-semibold text-select"><Icon name="check" size={18} /> Checked in</p>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (!view.lastHangout) return;
            setBusy(true);
            const r = await repo.checkIn(view.lastHangout.id);
            setBusy(false);
            if (!r.ok) notify.error("Not checked in. Try again.");
          }}
          className={cn(btn, "bg-select text-on-select")}
        >
          Check in
        </button>
      );
      break;
    case "locked":
    case "starting_soon":
    case "happening_now":
      action = (
        <p className="flex h-11 items-center justify-center gap-s1 rounded-full bg-sunken text-[15px] font-semibold text-ink">
          <Icon name="locked" size={18} /> {view.phase === "happening_now" ? "Happening now" : "Locked"}
        </p>
      );
      break;
    case "vote":
    case "ballot":
    case "waiting_reveal":
    case "planning_next":
    case "missed":
      action = (
        <Link href={href} className={cn(btn, "bg-sunken text-ink hover:bg-line")}>
          {view.phase === "vote" || (view.phase === "planning_next" && view.vote) ? "Vote on the time" : "Open"}
        </Link>
      );
      break;
    default:
      action = view.imIn ? (
        <p className="flex h-11 items-center justify-center gap-s1 rounded-full bg-sunken text-[15px] font-semibold text-select"><Icon name="check" size={18} /> You&apos;re in</p>
      ) : (
        <button type="button" disabled={actions.busy || !view.targetId} onClick={() => view.targetId && void actions.rsvp(view.targetId, "going")} className={cn(btn, "bg-spark text-on-spark")}>
          I&apos;m in
        </button>
      );
  }

  const loop = LOOP.has(view.phase);
  return (
    <Section
      title={loop ? "Last hangout" : "Next hangout"}
      action={
        <Link href={href} className="pressable text-[13px] font-semibold text-select hover:underline">
          Details
        </Link>
      }
    >
      {when && (
        <p className="tabular text-[22px] leading-[1.15] font-semibold tracking-[-0.02em] text-ink">
          {dayWord(when, minute)}, {shortTime(when)}
        </p>
      )}
      <p className="mt-1 text-[15px] leading-[1.35] text-ink-2">
        {title}
        {venue ? ` · ${venue.short_name ?? venue.name}` : ""}
        {plan?.cost ? ` · ${plan.cost}` : ""}
      </p>
      {!loop && (
        <p className="tabular mt-s3 text-[14px] font-semibold text-ink">
          {view.going.length} of {view.size} in
        </p>
      )}
      <div className="mt-s4">{action}</div>
      {!loop && plan && (plan.bring.length > 0 || plan.rain_plan) && (
        <dl className="mt-s4 flex flex-col gap-s3 rounded-[16px] bg-sunken p-s4 text-[14px] leading-[1.4]">
          {plan.bring.length > 0 && (
            <div>
              <dt className="text-[12px] font-semibold text-ink-2">Bring</dt>
              <dd className="text-ink">{plan.bring.join(" · ")}</dd>
            </div>
          )}
          {plan.rain_plan && (
            <div>
              <dt className="text-[12px] font-semibold text-ink-2">If it rains</dt>
              <dd className="text-ink">{plan.rain_plan}</dd>
            </div>
          )}
        </dl>
      )}
    </Section>
  );
}
