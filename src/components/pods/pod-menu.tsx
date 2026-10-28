// The table's one menu (wireframe M01; V3_SPEC §6.3; PLATFORM_SPEC §F2) and the sheets it opens. One sheet at a time:
// a sheet opened from the menu replaces it (DESIGN §10).
//   M01   "Hoopers #1"  ·  Why this plan, The place, Can't make it  |  Talk, Members, Memories, Invite, Mute
//         |  Report someone, Leave Hoopers (the risky ones apart, last)
//   S02   the place: name, address (the one place a city may appear), inside or out, Directions
//   D08   Give up your seat?  ·  Keep it / Give it up
//   Leave (OV-03, shortened): Leave Hoopers?  ·  Stay / Leave, then the next pod
// Pod details (/details) folds into this menu.
"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { directionsUrl } from "@/components/planner/plan-utils";
import { cn } from "@/lib/cn";
import type { Venue } from "@/lib/types";

export type PodSheet = null | "menu" | "place" | "giveup" | "leave" | "report" | "talk" | "members" | "memories";

/** Icon tone carries meaning: the plan is blue (--select), safety is teal (--safe), the rest is quiet ink. */
const TONE = { plan: "text-select", quiet: "text-ink-2", safe: "text-safe" } as const;

function Row({ icon, label, href, onClick, tone = "quiet", end, pressed }: { icon: IconName; label: string; href?: string; onClick?: () => void; tone?: keyof typeof TONE; end?: ReactNode; pressed?: boolean }) {
  const cls = "pressable flex min-h-14 w-full items-center gap-s4 border-t border-line text-left text-[17px] text-ink outline-offset-[-2px] hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)]";
  const body = (
    <>
      <Icon name={icon} size={24} className={cn("shrink-0", TONE[tone])} />
      <span className="flex-1">{label}</span>
      {end}
    </>
  );
  return href ? (
    <Link href={href} className={cls} onClick={onClick}>
      {body}
    </Link>
  ) : (
    <button type="button" className={cls} onClick={onClick} aria-pressed={pressed}>
      {body}
    </button>
  );
}

function Group({ children, last }: { children: ReactNode; last?: boolean }) {
  return <div className={cn("border-b border-line", !last && "mb-s8")}>{children}</div>;
}

export function PodMenuSheet({
  open,
  onOpenChange,
  title,
  name,
  whyHref,
  venue,
  canGiveUp,
  onSheet,
  podId,
  muted,
  onMute,
  unread = 0,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  name: string;
  whyHref: string | null;
  venue: Venue | null;
  canGiveUp: boolean;
  onSheet: (s: PodSheet) => void;
  podId: string;
  muted: boolean;
  onMute: () => void;
  unread?: number;
}) {
  const hasPlan = !!whyHref || !!venue || canGiveUp;
  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title={title}>
      {hasPlan && (
        <Group>
          {whyHref && <Row icon="why" tone="plan" label="Why this plan" href={whyHref} onClick={() => onOpenChange(false)} />}
          {venue && <Row icon="place" tone="plan" label="The place" onClick={() => onSheet("place")} />}
          {canGiveUp && <Row icon="undo" label="Can't make it" onClick={() => onSheet("giveup")} />}
        </Group>
      )}
      <Group>
        <Row icon="talk" label="Talk" onClick={() => onSheet("talk")} end={unread > 0 ? <span className="tabular text-label font-semibold text-select">{unread} new</span> : null} />
        <Row icon="person" label="Members" onClick={() => onSheet("members")} />
        <Row icon="again" label="Memories" onClick={() => onSheet("memories")} />
        <Row icon="add" label="Invite a friend" href={`/app/invite?pod=${podId}`} onClick={() => onOpenChange(false)} />
        <Row
          icon="bell"
          label="Mute"
          pressed={muted}
          onClick={onMute}
          end={
            <span aria-hidden className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", muted ? "bg-select" : "bg-line-2")}>
              <span className={cn("absolute top-0.5 size-6 rounded-full bg-lit shadow transition-transform", muted ? "translate-x-[22px]" : "translate-x-0.5")} />
            </span>
          }
        />
      </Group>
      <Group last>
        <Row icon="flag" tone="safe" label="Report someone" onClick={() => onSheet("report")} />
        <Row icon="block" tone="safe" label={`Leave ${name}`} onClick={() => onSheet("leave")} />
      </Group>
    </ResponsiveSheet>
  );
}

export function PlaceSheet({ open, onOpenChange, venue }: { open: boolean; onOpenChange: (o: boolean) => void; venue: Venue }) {
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={venue.name}
      description={<span data-allow-city>{venue.address}</span>}
      footer={
        <a href={directionsUrl(venue)} target="_blank" rel="noreferrer" className={buttonVariants({ size: "lg" })}>
          Directions <Icon name="arrow" size={20} />
        </a>
      }
    >
      <p className="text-[17px] text-ink">
        {venue.indoor ? "Inside" : "Outside"}
        {venue.cost_per_person === 0 && <span className="text-ink-2"> · free</span>}
      </p>
    </ResponsiveSheet>
  );
}

export function GiveUpSheet({ open, onOpenChange, onGiveUp, busy }: { open: boolean; onOpenChange: (o: boolean) => void; onGiveUp: () => void; busy?: boolean }) {
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Give up your seat?"
      description="It goes back to the pod."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Keep it
          </Button>
          <Button variant="danger" loading={busy} onClick={onGiveUp}>
            Give it up
          </Button>
        </>
      }
    />
  );
}
