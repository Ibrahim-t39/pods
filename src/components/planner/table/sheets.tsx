// planner_loop · the table's sheets (template §1 D): M01 menu, S01 Why this plan, S02 the place, D08 Give up your seat.
// One sheet at a time; a sheet opened from a sheet replaces it (DESIGN §10).
"use client";

import type { ReactNode } from "react";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/icons";
import { directionsUrl } from "../plan-utils";
import { freeCount, hm, placeWord, rainWord, sourceLine, wd3, type TableModel } from "./model";

export type SheetId = "menu" | "why" | "place" | "giveup" | "propose" | null;

const SLOT: Record<string, string> = {
  basketball: "hoops",
};

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="pt-row">
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

/** S01 rows · Why this plan (24 words max). Counts only, never names or reasons for absence (D11). */
export function whyRows(m: TableModel): [string, string][] {
  const s = m.plan;
  const f = freeCount(s);
  const day = m.iso ? `${wd3(m.iso)} ${hm(m.iso)}` : "";
  const topic = SLOT[m.pod.topic_key ?? ""] ?? m.pod.topic.toLowerCase();
  const weekend = m.iso ? [0, 6].includes(new Date(m.iso).getDay()) : false;
  const indoor = m.venue?.indoor;
  return [
    ["Why you", `${m.pod.type === "community" ? "same pod" : topic}${m.iso ? `, ${weekend ? "weekends" : "weeknights"}` : ""}`],
    ...(m.ages ? ([["Ages", m.ages[0] === m.ages[1] ? `${m.ages[0]}` : `${m.ages[0]} to ${m.ages[1]}`]] as [string, string][]) : []),
    ["Free", `${f ? (f.free >= f.of ? "everyone" : `${f.free} of ${f.of}`) : "most"}${day ? `, ${day}` : ""}`],
    ["Place", `${indoor ? "indoors" : "outdoors"}, public`],
    ["Rain", indoor ? "not needed" : m.rainVenue ? `${rainWord(m.rainVenue)}, ${placeWord(m.rainVenue)}` : "we move it"],
  ];
}

/** S01 · Why this plan as a sheet. The source line says AI, never the model's name. */
export function WhySheet({ m, open, onOpenChange, asPage }: { m: TableModel; open: boolean; onOpenChange: (o: boolean) => void; asPage?: boolean }) {
  const s = m.plan;
  const rows = whyRows(m);
  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title="Why this plan">
      {/* as the /plan/[id] route the sheet is the page, so it carries the page's one heading (the table under it is inert) */}
      {asPage && (
        <h1 className="sr-only">
          {m.name} #{m.view.round}
        </h1>
      )}
      <dl className="pt-rows" data-nc-list>
        {rows.map(([k, v]) => (
          <Row key={k} k={k} v={v} />
        ))}
      </dl>
      <p className="pt-foot-note">
        <Icon name="why" size={18} />
        {sourceLine(s)}.
      </p>
    </ResponsiveSheet>
  );
}

/** S02 · the place: name, address (the only place a city may appear), inside, meet, Directions. */
export function PlaceSheet({ m, open, onOpenChange }: { m: TableModel; open: boolean; onOpenChange: (o: boolean) => void }) {
  const v = m.venue;
  if (!v) return null;
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={placeWord(v)}
      description={
        <span data-allow-city className="block">
          {v.address}
        </span>
      }
      footer={
        <div className="flex justify-end">
          <Button asChild>
            <a href={directionsUrl(v)} target="_blank" rel="noreferrer">
              Directions
            </a>
          </Button>
        </div>
      }
    >
      <dl className="pt-rows">
        <Row k="Inside" v={v.indoor ? "yes" : "no"} />
        {v.meet_note && <Row k="Meet" v={v.meet_note.replace(/\.$/, "").slice(0, 40)} />}
        {m.rainVenue && !v.indoor && <Row k="Rain" v={placeWord(m.rainVenue)} />}
      </dl>
    </ResponsiveSheet>
  );
}

/** D08 · Give up your seat? Keep it (go) · Give it up (destructive). */
export function GiveUpSheet({ open, onOpenChange, onGiveUp }: { open: boolean; onOpenChange: (o: boolean) => void; onGiveUp: () => void }) {
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Give up your seat?"
      description="It goes back to the pod."
      footer={
        <div className="flex items-center justify-between gap-s4">
          <Button variant="link" onClick={() => onOpenChange(false)}>
            Keep it
          </Button>
          <Button variant="danger" leadingIcon={<Icon name="block" size={20} />} onClick={onGiveUp}>
            Give it up
          </Button>
        </div>
      }
    />
  );
}

function MenuRow({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button type="button" className="pt-mrow pressable" data-k="plan" onClick={onClick}>
      <Icon name={icon} size={22} />
      {label}
    </button>
  );
}

/**
 * M01 · the table's one menu. Planner rows first; core passes the risky rows (Report someone, Leave {pod}) as
 * `risky`, which sit apart at the bottom (template §1 D).
 */
export function PlanMenu({
  m,
  open,
  onOpenChange,
  go,
  risky,
  onAsk,
}: {
  m: TableModel;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  go: (s: SheetId) => void;
  risky?: ReactNode;
  /** "Ask AI for a new plan": a fresh option for this round (open plans only) */
  onAsk?: () => void;
}) {
  const hasPlan = !!m.plan && !["empty", "pending_review"].includes(m.view.phase);
  const canGiveUp = m.view.imIn && ["in", "locked", "starting_soon"].includes(m.view.phase);
  const canAsk = !!onAsk && ["proposed", "in"].includes(m.view.phase);
  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title={`${m.name} #${m.view.round}`}>
      <div className="pt-rows">
        {hasPlan && <MenuRow icon="why" label="Why this plan" onClick={() => go("why")} />}
        {hasPlan && m.venue && <MenuRow icon="place" label="The place" onClick={() => go("place")} />}
        {canGiveUp && <MenuRow icon="undo" label="Can't make it" onClick={() => go("giveup")} />}
        <div className="pt-gap" />
        {canAsk && (
          <MenuRow
            icon="turn"
            label="Ask AI for a new plan"
            onClick={() => {
              onOpenChange(false);
              onAsk?.();
            }}
          />
        )}
        <MenuRow icon="add" label="Propose a hangout" onClick={() => go("propose")} />
        {risky && (
          <>
            <div className="pt-gap" />
            {risky}
          </>
        )}
      </div>
    </ResponsiveSheet>
  );
}
