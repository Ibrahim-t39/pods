// /app/plans/[id] (planner_loop area): one plan or hangout. RSVP (I'm in / Can't), add to calendar (.ics), directions,
// what to bring, rain plan, check in after, and share with your trusted contact. `id` is a hangout or suggestion id.
"use client";

import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useDb, useRepo } from "@/lib/db/hooks";
import { useClock, nowISO } from "@/lib/time/clock";
import { formatTime, formatWhen } from "@/lib/time/format";
import { myPlans, planShareText, smsHref } from "@/lib/platform/selectors";
import { downloadIcs, icsFilename, icsForPlan } from "@/lib/platform/ics";
import { directionsUrl } from "@/lib/platform/directions";
import { useStore } from "@/lib/db/store";
import { Btn, Empty, PlatformPage, Row, Rows, Section } from "./kit";

export function PlanDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const now = useClock();
  const t = now.getTime();
  const item = useDb((db) => {
    const { upcoming, past } = myPlans(db, t);
    return [...upcoming, ...past].find((p) => p.id === id) ?? null;
  });
  const plan = useDb((db) => {
    const h = db.hangouts[id];
    return (h ? db.suggestions[h.suggestion_id] : db.suggestions[id])?.plan_json ?? null;
  });
  const contact = useDb((db) => (db.me ? (db.trustedContacts[db.me] ?? null) : null));
  const repo = useRepo();
  if (!item) return <PlatformPage title="Plan"><Empty>This plan isn&apos;t here anymore.</Empty></PlatformPage>;

  const ended = Date.parse(item.ends_at) <= t;
  const addToCalendar = () => {
    const db = useStore.getState().db;
    const target = db.hangouts[item.id] ?? db.suggestions[item.id];
    if (!target) return;
    downloadIcs(icsForPlan(target, item.venue, nowISO(), window.location.origin), icsFilename(item.title));
  };
  const rsvp = async (s: "going" | "not_going") => {
    const r = await repo.rsvp(item.id, s);
    if (!r.ok) toast("Not sent.");
  };
  const checkIn = async () => {
    const r = await repo.checkIn(item.id);
    toast(r.ok ? "Checked in." : "Not sent.");
  };

  return (
    <PlatformPage title={item.title}>
      <Section>
        <Rows>
          <Row title={formatWhen(item.starts_at)} sub={`Until ${formatTime(item.ends_at)}`} />
          {item.venue ? (
            <Row title={item.venue.short_name ?? item.venue.name} sub={<span data-allow-city>{item.venue.address}</span>} end={<a className="text-sm font-semibold" href={directionsUrl(item.venue)} target="_blank" rel="noreferrer">Directions</a>} />
          ) : null}
          <Row title={item.locked ? "Locked" : `${item.going} in`} sub={item.podName} />
        </Rows>
      </Section>
      <Section>
        <div className="flex flex-wrap gap-2">
          {!ended && item.me !== "going" ? <Btn tone="primary" onClick={() => void rsvp("going")}>I&apos;m in</Btn> : null}
          {!ended && item.me === "going" ? <Btn onClick={() => void rsvp("not_going")}>Can&apos;t make it</Btn> : null}
          {ended && item.locked && item.me === "going" && !item.checkedIn ? <Btn tone="primary" onClick={() => void checkIn()}>I went</Btn> : null}
          <Btn onClick={addToCalendar}>Add to calendar</Btn>
          {contact && item.locked ? (
            <a className="inline-flex min-h-[44px] items-center rounded-full border border-border px-4 text-sm font-semibold" href={smsHref(contact.phone, planShareText(item, formatWhen(item.starts_at), formatTime(item.ends_at)))}>
              Share with {contact.name}
            </a>
          ) : null}
        </div>
      </Section>
      {plan?.bring.length ? (
        <Section label="Bring">
          <Rows>{plan.bring.map((b) => <Row key={b} title={b} />)}</Rows>
        </Section>
      ) : null}
      {plan?.rain_plan ? (
        <Section label="If it rains">
          <Rows><Row title={item.rainVenue?.short_name ?? item.rainVenue?.name ?? "Rain plan"} sub={plan.rain_plan} /></Rows>
        </Section>
      ) : null}
    </PlatformPage>
  );
}
