// planner_loop · <PlanDetails>: the plan, opened from its card (video Scene 5 beat 5, then beat 6; V3_SPEC §6.4 S01).
// Route: /app/pods/[podId]/plan/[id]. No view-transition name here: the card stays mounted underneath, and two
// live elements with one name abort the transition. The sheet rises from the card's edge instead. Core's [podId] layout keeps the pod mounted underneath, so this is a sheet over
// it: full height on a phone (drag the top down or tap ✕ to close), a margin card on a laptop so the pod stays in view.
//
//   header   Hoopers #1 · "Saturday pickup run" · Saturday. / 10am. / Brahan Spring Park.   (shared element plan-<id>)
//   blocks   The plan (schedule) · Bring · Rain backup · Why this plan       (each `settle`s in as a slow scroll reaches it)
//   foot     ●●●○ 3 of 8 in                                       [I'm in]  (glass bar; ticks to 4 of 8 + Locked)
//
// Colour (COLOR_LIFE §13 beat 5): a white glass sheet and ink text; the pod's two-circle field sits behind the header
// and recedes as you scroll; the rain backup is marked by its icon in info blue. The only warm thing is "I'm in".
// On the lock the counter ticks and "Locked" pops, the sheet holds for a beat, then hands back to the pod, where the
// lock moment plays (one moment, never two).
"use client";

import { motion, useDragControls } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { InCount, useCalmMotion } from "@/components/brand";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { notify } from "@/components/ui/toast";
import { useIsDesktop } from "@/components/ui/use-media-query";
import { useRepo } from "@/lib/db/hooks";
import { downloadIcs, directionsUrl } from "../plan-utils";
import { usePlanActions } from "../use-plan-actions";
import { ProposeSheet } from "./propose-sheet";
import { GiveUpSheet } from "./sheets";
import { hm, placeWord, rainWord, sourceLine, weekday, type TableModel } from "./model";
import { costWord, planTitle, SeatRow, seatDots } from "./plan-card";
import { whyRows } from "./sheets";

export function PlanDetails({ m, onClose }: { m: TableModel; onClose: () => void }) {
  const repo = useRepo();
  const router = useRouter();
  const desktop = useIsDesktop();
  const calm = useCalmMotion();
  const drag = useDragControls();
  const [busy, setBusy] = useState(false);
  const [side, setSide] = useState<null | "propose" | "giveup">(null);
  const actions = usePlanActions(m.pod.id);
  const sheet = useRef<HTMLElement>(null);
  const v = m.view;
  const p = m.plan?.plan_json;
  const iso = m.iso;
  const locked = v.locked;
  const going = v.going.length;
  const of = Math.max(m.people.length, v.threshold);
  const place = placeWord(m.venue);
  const cost = costWord(m);
  const title = planTitle(m, iso);

  useEffect(() => {
    sheet.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector('[role="dialog"][data-state="open"]') && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const imIn = async () => {
    const t = v.targetId;
    if (!t || busy) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      notify("Not sent. You're offline.", { retry: () => void imIn(), duration: 6000 });
      return;
    }
    setBusy(true);
    const r = await repo.rsvp(t, "going");
    setBusy(false);
    if (!r.ok) {
      notify("Not sent.", { retry: () => void imIn(), duration: 6000 });
      return;
    }
    if (r.data.locked) {
      // beat 6: let "4 of 8 in · Locked" land on camera, then hand back to the pod for the lock moment
      setTimeout(() => router.replace(`/app/pods/${m.pod.id}`, { scroll: false }), calm ? 900 : 1700);
    } else notify("You're in.", { undo: () => void repo.rsvp(t, "not_going"), duration: 6000 });
  };

  // the quiet "more" row: one line of text links under the plan, never a second filled button
  const canAsk = (v.phase === "proposed" || v.phase === "in") && !!v.suggestion;
  const canGiveUp = v.imIn && ["in", "locked", "starting_soon"].includes(v.phase);
  const ask = () => {
    if (!v.suggestion) return;
    onClose();
    void actions.suggestElse(v.suggestion, []);
  };
  const giveUp = async () => {
    setSide(null);
    const t = v.hangout?.id ?? v.targetId;
    if (!t) return;
    const r = await repo.rsvp(t, "not_going");
    if (r.ok) notify("Seat given back.", { undo: () => void repo.rsvp(t, "going"), duration: 6000 });
  };

  const rain = !m.venue
    ? null
    : m.venue.indoor
      ? { line: "Indoors already.", sub: "Rain won't change it." }
      : m.rainVenue
        ? { line: `Moves to ${placeWord(m.rainVenue)}.`, sub: `Same time · ${rainWord(m.rainVenue)} · indoors` }
        : { line: "We pick a new time.", sub: "Same week. You confirm." };

  return (
    <div className="pd-root" role="presentation">
      <motion.button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        className="pd-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: calm ? 0.16 : 0.4 }}
        onClick={onClose}
      />
      <motion.section
        ref={sheet}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pd-title"
        className="pd"
        data-pod-hue={m.hue}
        initial={calm ? { opacity: 0 } : desktop ? { opacity: 0, x: 32 } : { y: "100%" }}
        animate={calm ? { opacity: 1 } : desktop ? { opacity: 1, x: 0 } : { y: 0 }}
        transition={calm ? { duration: 0.16 } : { type: "spring", stiffness: 260, damping: 32 }}
        drag={desktop ? false : "y"}
        dragControls={drag}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.7 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120 || info.velocity.y > 600) onClose();
        }}
      >
        <div className="pd-scroll">
          <span className="pd-field" aria-hidden />
          <div className="pd-grab" onPointerDown={(e) => drag.start(e)}>
            <span className="pd-handle" aria-hidden />
            <button type="button" className="pd-x pressable" onClick={onClose} aria-label="Close">
              <Icon name="close" size={22} />
            </button>
          </div>

            <header className="pd-head">
              <p className="pd-over">
                {m.name} <span className="tabular">#{v.round}</span>
              </p>
              <h1 id="pd-title" className="pd-title">
                {title}
              </h1>
              {iso && (
                <p className="pd-when tabular">
                  <span>{weekday(iso)}.</span>
                  <span>{hm(iso)}.</span>
                  <span className="pd-place">{place}.</span>
                </p>
              )}
              <p className="pd-tags">
                {m.plan && (
                  <span className="pd-tag" data-ai="">
                    <Icon name="why" size={16} />
                    {sourceLine(m.plan)}
                  </span>
                )}
                {cost && <span className="pd-tag">{cost}</span>}
                <span className="pd-tag">{m.venue?.indoor ? "Indoors" : "Outdoors"}</span>
                <span className="pd-tag">Public</span>
              </p>
            </header>

          {p?.schedule?.length ? (
            <section className="pd-block settle" aria-labelledby="pd-plan">
              <h2 id="pd-plan" className="pd-h">
                <Icon name="clock" size={18} />
                The plan
              </h2>
              <ol className="pd-sched">
                {p.schedule.slice(0, 5).map((r, i) => (
                  <li key={i}>
                    <span className="pd-t tabular">{r.time.replace(/:00/, "").replace(/\s?(AM|PM)/, (x) => x.trim().toLowerCase())}</span>
                    <span>{r.item}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {p?.bring?.length ? (
            <section className="pd-block settle" aria-labelledby="pd-bring">
              <h2 id="pd-bring" className="pd-h">
                <Icon name="check" size={18} />
                Bring
              </h2>
              <ul className="pd-bring">
                {p.bring.slice(0, 4).map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {rain && (
            <section className="pd-block settle" aria-labelledby="pd-rain">
              <h2 id="pd-rain" className="pd-h">
                <Icon name="rain" size={18} className="text-info-text" />
                Rain backup
              </h2>
              <p className="pd-line">{rain.line}</p>
              <p className="pd-sub">{rain.sub}</p>
            </section>
          )}

          <section className="pd-block settle" aria-labelledby="pd-why">
            <h2 id="pd-why" className="pd-h">
              <Icon name="why" size={18} />
              Why this plan
            </h2>
            <dl className="pt-rows pd-rows" data-nc-list>
              {whyRows(m).map(([k, val]) => (
                <div key={k} className="pt-row">
                  <dt>{k}</dt>
                  <dd>{val}</dd>
                </div>
              ))}
            </dl>
            <p className="pd-sub">{sourceLine(m.plan)}.</p>
            {m.venue && (
              <a className="pd-dir pressable" href={directionsUrl(m.venue)} target="_blank" rel="noreferrer">
                Directions
                <Icon name="arrow" size={18} />
              </a>
            )}
          </section>

          <nav className="pd-more settle" aria-label="More for this plan">
            {canGiveUp && (
              <button type="button" className="pd-more-b pressable" onClick={() => setSide("giveup")}>
                <Icon name="undo" size={20} />
                Can&apos;t make it
              </button>
            )}
            {canAsk && (
              <button type="button" className="pd-more-b pressable" onClick={ask}>
                <Icon name="turn" size={20} />
                Ask AI for a new plan
              </button>
            )}
            <button type="button" className="pd-more-b pressable" onClick={() => setSide("propose")}>
              <Icon name="add" size={20} />
              Propose a hangout
            </button>
          </nav>
        </div>

        <footer className="pd-foot glass">
          <span className="pd-count">
            <SeatRow dots={seatDots(m)} lockAt={v.threshold} locked={locked} size={desktop ? 26 : 22} />
            <InCount n={going} of={of} locked={locked} />
          </span>
          {locked ? (
            v.imIn ? (
              <Button
                variant="secondary"
                size="xl"
                onClick={() => v.hangout && downloadIcs({ id: v.hangout.id, title: `${m.name} #${v.round}`, starts_at: v.hangout.starts_at, ends_at: v.hangout.ends_at, venue: m.venue })}
              >
                Add to calendar
              </Button>
            ) : (
              <Button variant="spark" size="xl" onClick={() => void imIn()} loading={busy}>
                I&apos;m in
              </Button>
            )
          ) : v.imIn ? (
            <span className="pd-in">You&apos;re in</span>
          ) : (
            <Button variant="spark" size="xl" onClick={() => void imIn()} loading={busy} disabled={!v.targetId}>
              I&apos;m in
            </Button>
          )}
        </footer>
      </motion.section>
      <ProposeSheet m={m} open={side === "propose"} onOpenChange={(o) => setSide(o ? "propose" : null)} />
      <GiveUpSheet open={side === "giveup"} onOpenChange={(o) => setSide(o ? "giveup" : null)} onGiveUp={() => void giveUp()} />
    </div>
  );
}
