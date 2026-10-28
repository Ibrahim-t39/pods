// planner_loop · Propose a hangout (PLATFORM_SPEC §6 "propose a hangout"; V3_SPEC §6.4). A member suggests what, when
// and where; repo.proposeHangout turns it into an option for the pod (same round while a plan is open, else a new
// round). Places come only from the checked public list (active, public, no alcohol, within budget). Labels, no prose.
"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { notify } from "@/components/ui/toast";
import { useRepo } from "@/lib/db/hooks";
import { useStore } from "@/lib/db/store";
import { nowMs, toChicagoISO } from "@/lib/time/clock";
import { placeWord, type TableModel } from "./model";

const TIMES = [
  { h: 10, label: "10am" },
  { h: 13, label: "1pm" },
  { h: 17, label: "5pm" },
  { h: 19, label: "7pm" },
];

/** The next 7 days from the app clock, as Chicago dates ("2026-11-07") with a short label ("Sat 7"). */
function nextDays(fromMs: number) {
  return Array.from({ length: 7 }, (_, i) => {
    const iso = toChicagoISO(fromMs + (i + 1) * 86_400_000);
    const date = iso.slice(0, 10);
    const offset = iso.slice(19).replace(/^\.\d+/, "") || "-06:00";
    const d = new Date(`${date}T12:00:00${offset}`);
    return { date, offset, label: `${d.toLocaleDateString("en-US", { weekday: "short", timeZone: "America/Chicago" })} ${d.toLocaleDateString("en-US", { day: "numeric", timeZone: "America/Chicago" })}` };
  });
}

export function ProposeSheet({ m, open, onOpenChange }: { m: TableModel; open: boolean; onOpenChange: (o: boolean) => void }) {
  const repo = useRepo();
  const venues = useStore((s) => s.db.venues);
  const budget = useStore((s) => s.db.config.planner.budgetMax);
  const topic = m.pod.topic_key ?? "";
  const places = useMemo(() => {
    const ok = Object.values(venues).filter((v) => v.active && v.is_public && !v.alcohol_centered && v.cost_per_person <= budget);
    const fit = (v: (typeof ok)[number]) => (v.good_for.includes(topic) ? 0 : v.good_for.includes("any") ? 1 : 2);
    return ok.sort((a, b) => fit(a) - fit(b) || a.name.localeCompare(b.name)).slice(0, 4);
  }, [venues, budget, topic]);
  // open is the moment the days are read, so the list follows the app clock (Director jumps included)
  const days = useMemo(() => (open ? nextDays(nowMs()) : []), [open]);
  const [what, setWhat] = useState("");
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<number | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = !!what.trim() && !!day && time !== null && !!place;

  const reset = () => {
    setWhat("");
    setDay(null);
    setTime(null);
    setPlace(null);
    setError(null);
  };
  const send = async () => {
    if (!ready || busy) return;
    const d = days.find((x) => x.date === day)!;
    const starts_at = `${d.date}T${String(time).padStart(2, "0")}:00:00${d.offset}`;
    setBusy(true);
    const r = await repo.proposeHangout(m.pod.id, { title: what.trim(), starts_at, venue_id: place! });
    setBusy(false);
    if (!r.ok) {
      setError(r.error.message ?? "Not sent. Try again.");
      return;
    }
    onOpenChange(false);
    reset();
    notify("Sent to the pod.", { duration: 4000 });
  };

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      title="Propose a hangout"
      footer={
        <div className="flex items-center justify-between gap-s4">
          <span className="text-label text-ink-2" role={error ? "alert" : undefined}>
            {error ?? ""}
          </span>
          <Button size="lg" onClick={() => void send()} disabled={!ready} loading={busy}>
            Propose
          </Button>
        </div>
      }
    >
      <div className="pp">
        <Input label="What" value={what} onChange={(e) => setWhat(e.target.value)} maxLength={80} placeholder={m.pod.topic_key === "basketball" ? "Pickup run" : "Something to do"} />
        <fieldset className="pp-group">
          <legend className="pp-k">Day</legend>
          <div className="pp-chips">
            {days.map((d) => (
              <Chip key={d.date} kind="radio" size="sm" selected={day === d.date} onSelectedChange={() => setDay(d.date)}>
                {d.label}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset className="pp-group">
          <legend className="pp-k">Time</legend>
          <div className="pp-chips">
            {TIMES.map((t) => (
              <Chip key={t.h} kind="radio" size="sm" selected={time === t.h} onSelectedChange={() => setTime(t.h)}>
                {t.label}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset className="pp-group">
          <legend className="pp-k">Place</legend>
          <div className="pp-chips">
            {places.map((v) => (
              <Chip key={v.id} kind="radio" size="sm" selected={place === v.id} onSelectedChange={() => setPlace(v.id)}>
                {placeWord(v)}
              </Chip>
            ))}
          </div>
        </fieldset>
      </div>
    </ResponsiveSheet>
  );
}
