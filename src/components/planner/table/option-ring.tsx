// planner_loop · OptionRing (wireframes E05, E05b; J #2: circles, not percentages).
// Each option is a circle; people's discs gather on the rim of the one they picked, and a circle grows a little with
// each vote. Everyone wears their own logo colour (COLOR_LIFE §5.3); your disc waits under the circles (the ember spark) and moves onto the one you pick (layoutId), before you commit.
"use client";

import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { figures, SNAPPY, type PodHueKey } from "@/components/brand";
import { YOU_COLOR, personColor } from "@/components/brand/disc";
import { hm, wd3, type Person } from "./model";

export interface VoteOption {
  id: string;
  iso: string;
  place: string;
  voters: Person[];
}

const LAYOUT: Record<number, { x: number; y: number }[]> = {
  1: [{ x: 0.5, y: 0.42 }],
  2: [{ x: 0.28, y: 0.4 }, { x: 0.72, y: 0.5 }],
  // a triangle whose centres sit >= 0.46W apart, so circles capped at 0.42W never overlap (QA: Sun 22 / Sun 29)
  3: [{ x: 0.27, y: 0.28 }, { x: 0.73, y: 0.28 }, { x: 0.5, y: 0.72 }],
};

export function OptionRing({
  options,
  picked,
  onPick,
  me,
  hue,
  size,
  showPlace,
}: {
  options: VoteOption[];
  picked: string | null;
  onPick: (id: string) => void;
  me: Person | null;
  hue: PodHueKey;
  size: number;
  showPlace: boolean;
}) {
  const reduce = useReducedMotion();
  const W = size;
  const pos = LAYOUT[Math.min(3, options.length)] ?? LAYOUT[3];
  const vd = Math.max(28, Math.round(W * 0.085));
  const youD = Math.max(44, Math.round(W * 0.12));
  // Two options on the same weekday carry the date ("Sun 15", "Sun 22") so they never read as the same time.
  const sameDay = new Set(options.map((o) => wd3(o.iso)).filter((d, i, a) => a.indexOf(d) !== i));
  const dayOf = (iso: string) => (sameDay.has(wd3(iso)) ? `${wd3(iso)} ${new Date(iso).getDate()}` : wd3(iso));
  return (
    <LayoutGroup id="vote">
      <div className="pt-opts" data-pod-hue={hue} style={{ width: W, height: W * 1.02 }} role="radiogroup" aria-label="Pick a time">
        {options.slice(0, 3).map((o, i) => {
          const n = o.voters.filter((v) => !v.me).length + (picked === o.id ? 1 : 0);
          const d = Math.min(W * (options.length === 3 ? 0.42 : 0.42), W * (options.length === 3 ? 0.3 : 0.36) + n * W * 0.03);
          const p = pos[i];
          const mine = picked === o.id;
          const others = o.voters.filter((v) => !v.me);
          const rim = [...others.map((v) => ({ key: v.id, initial: v.initial, name: v.name, me: false })), ...(mine && me ? [{ key: "me", initial: me.initial, name: me.name, me: true }] : [])];
          return (
            <motion.button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={mine}
              aria-label={`${dayOf(o.iso)} ${hm(o.iso)}${o.place ? `, ${o.place}` : ""}${others.length ? `, ${others.length} picked` : ""}`}
              className="pt-opt pressable"
              onClick={() => onPick(o.id)}
              initial={reduce ? false : { scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, width: d, height: d, left: W * p.x - d / 2, top: W * p.y - d / 2 }}
              transition={{ ...SNAPPY, delay: reduce ? 0 : 0.08 + i * 0.1 }}
            >
              <span className="pt-opt-day" style={{ fontSize: Math.round(d * 0.2) }}>
                {figures(dayOf(o.iso))}
              </span>
              <span className="pt-opt-time">{hm(o.iso)}</span>
              {showPlace && o.place && <span className="pt-opt-place" style={{ maxWidth: d * 0.72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.place}</span>}
              {rim.map((v, k) => {
                const a = ((90 + (k - (rim.length - 1) / 2) * 24) * Math.PI) / 180;
                const sz = v.me ? youD * 0.8 : vd;
                return (
                  <motion.span
                    key={v.key}
                    layoutId={v.me ? "vote-you" : undefined}
                    aria-hidden
                    data-nc
                    className="pt-voter"
                    transition={SNAPPY}
                    style={{
                      left: d / 2 + (d / 2) * Math.cos(a) - sz / 2,
                      top: d / 2 + (d / 2) * Math.sin(a) - sz / 2,
                      width: sz,
                      height: sz,
                      fontSize: Math.round(sz * 0.5),
                      background: v.me ? YOU_COLOR.bg : personColor(v.name ?? v.initial).bg,
                      color: v.me ? YOU_COLOR.fg : personColor(v.name ?? v.initial).fg,
                    }}
                  >
                    {v.initial}
                  </motion.span>
                );
              })}
            </motion.button>
          );
        })}
        {!picked && me && (
          <motion.span
            layoutId="vote-you"
            aria-hidden
            data-nc
            className="pt-voter"
            transition={SNAPPY}
            style={{ left: W / 2 - youD / 2, top: W * 1.02 - youD, width: youD, height: youD, fontSize: Math.round(youD * 0.5), background: YOU_COLOR.bg, color: YOU_COLOR.fg }}
          >
            {me.initial}
          </motion.span>
        )}
      </div>
    </LayoutGroup>
  );
}
