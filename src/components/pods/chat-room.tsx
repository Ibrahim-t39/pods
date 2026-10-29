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
import { Button } from "@/components/ui/button";
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
          .map((m) => ({ id: m.user_id, name: m.user_id === db.me ? (db.users[m.user_id]?.first_name ?? "You") : firstName(db, m.user_id), you: m.user_id === db.me }))
          .sort((a, b) => Number(b.you) - Number(a.you) || a.name.localeCompare(b.name)),
      [podId],
    ),
  );
  const photos = useDb(useCallback((db) => Object.values(db.memories).filter((x) => x.pod_id === podId && x.photo_url && !x.removed_at).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6), [podId]));
  const meId = useDb((db) => db.me);
  const going = new Set([...(view?.going ?? []), ...(view?.imIn && !LOOP.has(view.phase) ? [meId] : [])]);
  const sorted = [...people].sort((a, b) => Number(b.you) - Number(a.you) || Number(going.has(b.id)) - Number(going.has(a.id)));

  return (
    <aside aria-label="About this pod" className="min-h-0 overflow-y-auto border-l border-line bg-lit">
      {view && <NextPlan view={view} podId={podId} minute={minute} />}
      <Section
        title={`People · ${people.length}`}
        action={
          <Link href={`/app/pods/${podId}/members`} className="pressable text-[13px] font-semibold text-select hover:underline">
            See all
          </Link>
        }
      >
        <ul className="flex flex-col">
          {sorted.map((p) => (
            <li key={p.id} className="flex min-h-11 items-center gap-s3">
              <span className={cn("rounded-full", going.has(p.id) && "shadow-[0_0_0_2px_var(--lit),0_0_0_4px_var(--grove-500)]")}>
                <Face name={p.name} you={p.you} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{p.you ? "You" : p.name}</span>
              {going.has(p.id) && <span className="text-[13px] font-semibold text-grove-text">In</span>}
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

/** "If rain is likely, Pods moves it to Brahan Spring Rec Center and tells everyone." -> "Moves to Brahan Spring Rec Center" */
function rainShort(t: string) {
  const to = t.match(/moves? (?:it |everyone )?to ([^,.]+?)(?: and\b|[,.]|$)/i);
  if (to) return `Moves to ${to[1].trim()}`;
  if (/indoors already/i.test(t)) return "Indoors, no change";
  if (/new time/i.test(t)) return "The pod picks a new time";
  return t.replace(/\.$/, "");
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

  if (view.phase === "empty" || !title) {
    return (
      <Section title="Next hangout">
        <p className="text-[15px] leading-[1.4] text-ink-2">Nothing planned yet. The AI picks a time and place that works for most of you.</p>
        <Button size="sm" className="mt-s4" disabled={actions.genKind !== null} loading={actions.busy} onClick={() => void actions.planNow()}>
          Ask AI for a plan
        </Button>
      </Section>
    );
  }

  // one action, the app's standard small pill; settled states are a quiet status beside the count, never a slab
  const status = (icon: "check" | "locked", label: string, tone = "text-ink") => (
    <span className={cn("inline-flex h-11 items-center gap-s1 text-[15px] font-semibold", tone)}>
      <Icon name={icon} size={18} /> {label}
    </span>
  );
  let action: React.ReactNode;
  switch (view.phase) {
    case "check_in":
      action = view.checkedIn ? (
        status("check", "Checked in", "text-select")
      ) : (
        <Button
          size="sm"
          loading={busy}
          onClick={async () => {
            if (!view.lastHangout) return;
            setBusy(true);
            const r = await repo.checkIn(view.lastHangout.id);
            setBusy(false);
            if (!r.ok) notify.error("Not checked in. Try again.");
          }}
        >
          Check in
        </Button>
      );
      break;
    case "locked":
    case "starting_soon":
    case "happening_now":
      action = status("locked", view.phase === "happening_now" ? "Happening now" : "Locked");
      break;
    case "vote":
    case "ballot":
    case "waiting_reveal":
    case "planning_next":
    case "missed":
      action = (
        <Button asChild size="sm" variant="secondary">
          <Link href={href}>{view.phase === "vote" || (view.phase === "planning_next" && view.vote) ? "Vote on the time" : "Open"}</Link>
        </Button>
      );
      break;
    default:
      action = view.imIn ? (
        status("check", "You're in", "text-grove-text")
      ) : (
        <Button size="sm" variant="spark" loading={actions.busy} disabled={!view.targetId} onClick={() => view.targetId && void actions.rsvp(view.targetId, "going")}>
          I&apos;m in
        </Button>
      );
  }

  const loop = LOOP.has(view.phase);
  const rain = plan?.rain_plan ? rainShort(plan.rain_plan) : null;
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
      <div className="mt-s4 flex items-center justify-between gap-s3">
        {!loop ? (
          <p className="tabular text-[15px] font-semibold text-ink">
            {view.going.length} of {view.size} in
          </p>
        ) : (
          <span />
        )}
        {action}
      </div>
      {!loop && plan && (plan.bring.length > 0 || rain) && (
        <dl className="mt-s4 grid grid-cols-[auto_1fr] gap-x-s3 gap-y-s2 border-t border-line pt-s4 text-[14px] leading-[1.4]">
          {plan.bring.length > 0 && (
            <>
              <dt className="font-semibold text-ink-2">Bring</dt>
              <dd className="text-ink">{plan.bring.join(" · ")}</dd>
            </>
          )}
          {rain && (
            <>
              <dt className="font-semibold text-ink-2">Rain</dt>
              <dd className="text-ink">{rain}</dd>
            </>
          )}
        </dl>
      )}
    </Section>
  );
}
