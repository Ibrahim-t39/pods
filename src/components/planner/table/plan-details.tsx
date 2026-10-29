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
import { LockStepper } from "./lock-stepper";
import { lockCopy } from "@/lib/planner/lock";
import { ProposeSheet } from "./propose-sheet";
import { GiveUpSheet } from "./sheets";
import { placeWord, rainWord, sourceLine, type TableModel } from "./model";

import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/time/tz";
import { planPlace, planSoon, planWhen } from "../plan-display";
import { costWord, planTitle, SeatRow, seatDots } from "./plan-card";
import { whyRows } from "./sheets";

export function PlanDetails({
  m,
  onClose,
}: {
  m: TableModel;
  onClose: () => void;
}) {
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
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" &&
      !document.querySelector('[role="dialog"][data-state="open"]') &&
      onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const imIn = async () => {
    const t = v.targetId;
    if (!t || busy) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      notify("Not sent. You're offline.", {
        retry: () => void imIn(),
        duration: 6000,
      });
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
      setTimeout(
        () => router.replace(`/app/pods/${m.pod.id}`, { scroll: false }),
        calm ? 900 : 1700,
      );
    } else
      notify("You're in.", {
        undo: () => void repo.rsvp(t, "not_going"),
        duration: 6000,
      });
  };

  // the quiet "more" row: one line of text links under the plan, never a second filled button
  const canAsk = (v.phase === "proposed" || v.phase === "in") && !!v.suggestion;
  const canGiveUp =
    v.imIn && ["in", "locked", "starting_soon"].includes(v.phase);
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
    if (r.ok)
      notify("You're out for this one.", {
        undo: () => void repo.rsvp(t, "going"),
        duration: 6000,
      });
  };

  const rain = !m.venue
    ? null
    : m.venue.indoor
      ? { line: "Indoors already", sub: "Rain won't change it" }
      : m.rainVenue
        ? {
            line: `Moves to ${planPlace(m.rainVenue)}`,
            sub: `Same time · ${rainWord(m.rainVenue)} · indoors`,
          }
        : { line: "We pick a new time", sub: "Same week, you confirm" };

  const ends = v.hangout?.ends_at ?? p?.ends_at ?? null;
  const goingNames = m.people
    .filter((x) => v.going.includes(x.id))
    .map((x) => (x.me ? "You" : x.name));
  const toLock = Math.max(0, v.threshold - going);
  const status = locked
    ? "Locked"
    : v.imIn
      ? "You're in"
      : toLock > 0
        ? lockCopy(toLock)
        : "Proposed";
  const soon = iso ? planSoon(iso, m.nowMs) : "";
  // "Sat 10am–12pm" / "Nov 7 · In 3 days" (one date style app-wide, plan-display)
  const when = iso ? planWhen(iso, m.nowMs, ends) : "";
  const whenSub = iso
    ? when.includes(" · ")
      ? soon
      : [formatInTimeZone(iso, TZ, "MMM d"), soon].filter(Boolean).join(" · ")
    : "";
  const placeSub = [
    m.venue?.meet_note?.replace(/\.$/, "") || m.venue?.address,
    cost,
    m.venue ? (m.venue.indoor ? "Indoors" : "Outdoors") : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const reason = m.plan?.plan_json.reason?.replace(/\.$/, "");
  const calendar = () => {
    const t =
      v.hangout ??
      (iso && ends
        ? { id: v.targetId ?? m.pod.id, starts_at: iso, ends_at: ends }
        : null);
    if (t)
      downloadIcs({
        id: t.id,
        title: `${m.name}: ${title}`,
        starts_at: t.starts_at,
        ends_at: t.ends_at,
        venue: m.venue,
      });
  };

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
        initial={
          calm
            ? { opacity: 0 }
            : desktop
              ? { opacity: 0, x: 32 }
              : { y: "100%" }
        }
        animate={
          calm ? { opacity: 1 } : desktop ? { opacity: 1, x: 0 } : { y: 0 }
        }
        transition={
          calm
            ? { duration: 0.16 }
            : { type: "spring", stiffness: 260, damping: 32 }
        }
        drag={desktop ? false : "y"}
        dragControls={drag}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.7 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120 || info.velocity.y > 600) onClose();
        }}
      >
        <div
          className="pd-scroll"
          // the top bar turns solid once the details scroll under it (no overlap with the title)
          onScroll={(e) => e.currentTarget.toggleAttribute("data-scrolled", e.currentTarget.scrollTop > 8)}
        >
          <span className="pd-field" aria-hidden />
          <div className="pd-grab" onPointerDown={(e) => drag.start(e)}>
            <span className="pd-handle" aria-hidden />
            <p className="pd-over">
              <span className="pd-dot" aria-hidden />
              <span className="truncate">{`${m.name} · Hangout #${v.round}`}</span>
            </p>
            <button
              type="button"
              className="pd-x pressable"
              onClick={onClose}
              aria-label="Close"
            >
              <Icon name="close" size={22} />
            </button>
          </div>

          <header className="pd-head">
            <span
              className="pd-status"
              data-locked={locked ? "" : undefined}
              data-in={v.imIn && !locked ? "" : undefined}
            >
              {locked && <Icon name="locked" size={14} />}
              {status}
            </span>
            <h1 id="pd-title" className="pd-title">
              {title}
            </h1>
          </header>

          <ul className="pd-facts">
            {iso && (
              <li>
                <Icon name="clockFace" size={20} />
                <span className="pd-fact">
                  <span className="pd-fact-k tabular">{when}</span>
                  {whenSub && (
                    <span className="pd-fact-s tabular">{whenSub}</span>
                  )}
                </span>
                <button
                  type="button"
                  className="pd-act pressable"
                  onClick={calendar}
                  aria-label="Add to calendar"
                >
                  Calendar
                </button>
              </li>
            )}
            <li>
              <Icon name="place" size={20} />
              <span className="pd-fact">
                <span className="pd-fact-k">{place}</span>
                {placeSub && (
                  <span className="pd-fact-s" data-allow-city>
                    {placeSub}
                  </span>
                )}
              </span>
              {m.venue && (
                <a
                  className="pd-act pressable"
                  href={directionsUrl(m.venue)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Directions
                </a>
              )}
            </li>
            {m.plan && (
              <li data-ai="">
                <Icon name="why" size={20} />
                <span className="pd-fact">
                  <span className="pd-fact-k">{sourceLine(m.plan)}</span>
                  {reason && <span className="pd-fact-s">{reason}</span>}
                </span>
              </li>
            )}
          </ul>

          <div className="pd-grid pd-pair">
            {p?.bring?.length ? (
              <section className="pd-block" aria-labelledby="pd-bring">
                <h2 id="pd-bring" className="pd-h">
                  Bring
                </h2>
                <ul className="pd-bring">
                  {p.bring.slice(0, 4).map((b) => (
                    <li key={b}>
                      <Icon name="check" size={18} />
                      {b}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {rain && (
              <section className="pd-block" aria-labelledby="pd-rain">
                <h2 id="pd-rain" className="pd-h">
                  Rain backup
                </h2>
                <p className="pd-rain">
                  <Icon name="cloud" size={20} />
                  <span>
                    <span className="pd-fact-k">{rain.line}</span>
                    <span className="pd-fact-s">{rain.sub}</span>
                  </span>
                </p>
              </section>
            )}
          </div>

          <section className="pd-block pd-who" aria-labelledby="pd-who">
            <h2 id="pd-who" className="pd-h">
              Who&apos;s in
            </h2>
            <div className="pd-who-row">
              <SeatRow
                dots={seatDots(m)}
                lockAt={v.threshold}
                locked={locked}
                size={24}
              />
              <p className="pd-who-names">
                {goingNames.length ? goingNames.join(", ") : "No one yet"}
              </p>
            </div>
            {!locked && m.plan && v.suggestion?.id === m.plan.id && (m.plan.status === "suggested" || m.plan.status === "pending_review") ? (
              <LockStepper
                suggestionId={m.plan.id}
                at={v.threshold}
                size={v.size}
                going={going}
                reason={m.plan.lock_reason}
                seats={m.plan.max_seats}
                onLocked={() =>
                  setTimeout(
                    () => router.replace(`/app/pods/${m.pod.id}`, { scroll: false }),
                    calm ? 900 : 1700,
                  )
                }
              />
            ) : locked && m.plan?.max_seats ? (
              <p className="pd-fact-s pd-lock-seats">{m.plan.max_seats} seats</p>
            ) : null}
          </section>

          {p?.schedule?.length ? (
            <section className="pd-block" aria-labelledby="pd-plan">
              <h2 id="pd-plan" className="pd-h">
                The plan
              </h2>
              <ol className="pd-sched">
                {p.schedule.slice(0, 5).map((r, i) => (
                  <li key={i}>
                    <span className="pd-t tabular">
                      {r.time
                        .replace(/:00/, "")
                        .replace(/\s?(AM|PM)/, (x) => x.trim().toLowerCase())}
                    </span>
                    <span>{r.item}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <section className="pd-block" aria-labelledby="pd-why">
            <h2 id="pd-why" className="pd-h">
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
          </section>

          <nav className="pd-more" aria-label="More for this plan">
            {canAsk && (
              <button
                type="button"
                className="pd-more-b pressable"
                onClick={ask}
              >
                <Icon name="turn" size={20} />
                Ask AI for a different plan
              </button>
            )}
            <button
              type="button"
              className="pd-more-b pressable"
              onClick={() => setSide("propose")}
            >
              <Icon name="add" size={20} />
              Propose a hangout
            </button>
            {canGiveUp && (
              <button
                type="button"
                className="pd-more-b pressable"
                onClick={() => setSide("giveup")}
              >
                <Icon name="undo" size={20} />
                Can&apos;t make it
              </button>
            )}
          </nav>
        </div>

        <footer className="pd-foot glass">
          <span className="pd-count">
            <InCount n={going} of={of} locked={locked} />
            <span className="pd-fact-s">
              {locked
                ? v.imIn
                  ? "You're in"
                  : "Still room for you"
                : toLock > 0
                  ? lockCopy(toLock)
                  : soon}
            </span>
          </span>
          {locked ? (
            v.imIn ? (
              <Button variant="secondary" size="lg" onClick={calendar}>
                Add to calendar
              </Button>
            ) : (
              <Button
                variant="spark"
                size="lg"
                onClick={() => void imIn()}
                loading={busy}
              >
                I&apos;m in
              </Button>
            )
          ) : v.imIn ? (
            <Button variant="secondary" size="lg" onClick={calendar}>
              Add to calendar
            </Button>
          ) : (
            <Button
              variant="spark"
              size="lg"
              onClick={() => void imIn()}
              loading={busy}
              disabled={!v.targetId}
            >
              I&apos;m in
            </Button>
          )}
        </footer>
      </motion.section>
      <ProposeSheet
        m={m}
        open={side === "propose"}
        onOpenChange={(o) => setSide(o ? "propose" : null)}
        onAskAI={canAsk ? ask : undefined}
      />
      <GiveUpSheet
        open={side === "giveup"}
        onOpenChange={(o) => setSide(o ? "giveup" : null)}
        onGiveUp={() => void giveUp()}
      />
    </div>
  );
}
