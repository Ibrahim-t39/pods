// The one city picker (V3_SPEC §6.2, DESIGN §1 rule 5): reached only from "Not here?" on Keep your seat. The only
// place in first run where a city name appears, inside [data-allow-city]. "Somewhere else" goes to the waitlist.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Line } from "@/components/brand/line";
import { Icon } from "@/components/icons";
import { useDb, useRepo } from "@/lib/db/hooks";
import type { User } from "@/lib/types";
import { FlowStep } from "../flow";
import { useDraft } from "../draft";
import { Guarded } from "../guard";
import { STEP_ROUTE, commitDraft } from "../steps";

export function CityScreen() {
  return <Guarded need="none">{(me) => <City me={me} />}</Guarded>;
}

function City({ me }: { me: User | null }) {
  const router = useRouter();
  const repo = useRepo();
  const metro = useDb((db) => db.config.placement.metro);
  const city = useDraft((s) => s.city) ?? metro[0];

  const pick = async (c: string) => {
    useDraft.getState().set({ city: c });
    if (me && !me.first_name) {
      const r = await commitDraft(repo, metro);
      if (r.ok) return router.push(STEP_ROUTE.promise);
    }
    router.push(STEP_ROUTE.seat);
  };

  const row = "flex min-h-14 w-full items-center gap-s3 border-t border-line text-left text-body-lg text-ink";
  return (
    <FlowStep
      screen="city"
      back={STEP_ROUTE.seat}
      label="City"
      head={
        <>
          <Line size="lg">Where are you?</Line>
          <ul className="mt-s8 max-w-[400px]" data-allow-city role="radiogroup" aria-label="City">
            {metro.map((c) => (
              <li key={c}>
                <button type="button" role="radio" aria-checked={city === c} onClick={() => pick(c)} className={row}>
                  <span
                    aria-hidden
                    className="size-[22px] flex-none rounded-full"
                    style={city === c ? { background: "var(--select)" } : { boxShadow: "inset 0 0 0 1.5px var(--line-2)" }}
                  />
                  {c}
                </button>
              </li>
            ))}
            <li>
              <Link href="/waitlist" className={`${row} border-b`}>
                <Icon name="arrow" size={22} />
                Somewhere else
              </Link>
            </li>
          </ul>
        </>
      }
    />
  );
}
