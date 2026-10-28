// planner_loop · VoteCards (wireframes E05/E05b, rebuilt after QA round 1; J #2: people, not percentages).
// "Pick a time." The options are legible cards on one axis: day and date, time, the full place, and the discs of
// the people who picked it. Tapping a card is your vote (one tap on camera, change it by tapping another). The
// option exactly two weeks after the last hangout leads ("Same people, two weeks later", video beat 7), the rest
// follow by date.
"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Disc, POP, SNAPPY, type PodHueKey } from "@/components/brand";
import { Icon } from "@/components/icons";
import { hm, type Person } from "./model";

export interface VoteCardOption {
  id: string;
  iso: string;
  /** the full place name ("Brahan Spring Rec Center"), never truncated */
  place: string;
  voters: Person[];
}

const DAY = 86_400_000;
export const dateWord = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

/** The +14-day option first, then by date. */
export function orderOptions<T extends { iso: string }>(options: T[], lastIso: string | null | undefined): { list: T[]; twoWeeks: T | null } {
  const byDate = [...options].sort((a, b) => Date.parse(a.iso) - Date.parse(b.iso));
  if (!lastIso) return { list: byDate, twoWeeks: null };
  const last = Date.parse(lastIso);
  const twoWeeks = byDate.find((o) => Math.round((Date.parse(o.iso) - last) / DAY) === 14) ?? null;
  return { list: twoWeeks ? [twoWeeks, ...byDate.filter((o) => o !== twoWeeks)] : byDate, twoWeeks };
}

export function VoteCards({
  options,
  picked,
  onPick,
  me,
  hue,
  twoWeeksId,
  disabled,
}: {
  options: VoteCardOption[];
  picked: string | null;
  onPick: (id: string) => void;
  me: Person | null;
  hue: PodHueKey;
  twoWeeksId: string | null;
  disabled?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="vc" data-pod-hue={hue} role="radiogroup" aria-label="Pick a time">
      {options.slice(0, 3).map((o, i) => {
        const mine = picked === o.id;
        const others = o.voters.filter((v) => !v.me);
        return (
          <motion.button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={mine}
            aria-label={`${dateWord(o.iso)}, ${hm(o.iso)}, ${o.place}${others.length ? `, ${others.length} picked` : ""}`}
            className="vc-card pressable"
            onClick={() => onPick(o.id)}
            disabled={disabled}
            whileTap={{ scale: 0.98 }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0.16 } : { ...SNAPPY, delay: 0.06 + i * 0.07 }}
          >
            <span className="vc-text">
              {o.id === twoWeeksId && <span className="vc-tag">2 weeks later</span>}
              <span className="vc-day tabular">{dateWord(o.iso)}</span>
              <span className="vc-meta tabular">
                {hm(o.iso)} · {o.place}
              </span>
            </span>
            <span className="vc-side">
              <span className="vc-voters" aria-hidden>
                <AnimatePresence initial={false}>
                  {others.slice(0, 4).map((v, k) => (
                    <motion.span key={v.id} style={{ marginLeft: k ? -8 : 0, zIndex: 8 - k }} initial={reduce ? false : POP.initial} animate={POP.animate} exit={{ opacity: 0, scale: 0.6 }} transition={POP.transition}>
                      <Disc tone={hue} seed={v.id} initial={v.initial} size={28} ring />
                    </motion.span>
                  ))}
                  {mine && me && (
                    <motion.span key="me" style={{ marginLeft: others.length ? -8 : 0 }} initial={reduce ? false : POP.initial} animate={POP.animate} exit={{ opacity: 0, scale: 0.6 }} transition={POP.transition}>
                      <Disc tone="you" initial={me.initial} size={28} ring />
                    </motion.span>
                  )}
                </AnimatePresence>
                {others.length > 4 && <span className="vc-more tabular">+{others.length - 4}</span>}
              </span>
              <span className="vc-check" data-on={mine ? "" : undefined} aria-hidden>
                {mine && <Icon name="check" size={16} />}
              </span>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
