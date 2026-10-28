// B01 You (1 of 4) and B01e under 18. The sentence is the form: "I'm ___, __." The name and the age are typed into
// the headline itself (call graft; AW 06, 58; PB 1.6). The age is a visible box so it reads as a field (designer
// R2 #10). Under 18: "Pods is 18 and up." and Next stays off (B #1). Nothing leaves the browser yet.
// Object: the Doorway's table, three people seated; as you type, your disc waits beside your seat (DESIGN §7).
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Line } from "@/components/brand/line";
import { Button } from "@/components/ui/button";
import { useDb } from "@/lib/db/hooks";
import { FlowStep, InlineField, Sub, useTableSize } from "../flow";
import { SeatTable } from "../objects";
import { useDraft } from "../draft";
import { Guarded } from "../guard";
import { BACK, DOT, STEP_ROUTE } from "../steps";

export function YouScreen() {
  return <Guarded need="none">{() => <You />}</Guarded>;
}

function You() {
  const router = useRouter();
  const { size } = useTableSize();
  const draft = useDraft();
  const { minAge, maxAge } = useDb((db) => ({ minAge: db.config.placement.minAge, maxAge: db.config.placement.maxAge }));
  const [name, setName] = useState(draft.firstName);
  const [age, setAge] = useState(draft.age ? String(draft.age) : "");
  const nameRef = useRef<HTMLInputElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => (name ? ageRef : nameRef).current?.focus({ preventScroll: true }), 360);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const n = age ? Number(age) : null;
  const young = n !== null && age.length === 2 && n < minAge;
  const old = n !== null && n > maxAge;
  const ok = name.trim().length >= 1 && n !== null && n >= minAge && n <= maxAge;
  const initial = name.trim().slice(0, 1).toUpperCase();

  const next = () => {
    if (!ok) return;
    draft.set({ firstName: name.trim(), age: n });
    router.push(STEP_ROUTE.likes);
  };

  return (
    <FlowStep
      screen="you"
      back={BACK.you}
      label="You"
      head={
        <form
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
        >
          <p className="pods-ob-intro">A minute, then your pods.</p>
          <Line size="lg" className="[text-wrap:wrap]">
            I&apos;m{" "}
            <span className="whitespace-nowrap">
            <InlineField
              ref={nameRef}
              aria-label="First name"
              placeholder="name"
              value={name}
              maxLength={20}
              autoComplete="given-name"
              autoCapitalize="words"
              enterKeyHint="next"
              onChange={(e) => setName(e.target.value.replace(/[^\p{L}' -]/gu, "").replace(/^\s+/, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  ageRef.current?.focus();
                }
              }}
            />
            ,
            </span>{" "}
            <span className="whitespace-nowrap">
            <InlineField
              ref={ageRef}
              box
              aria-label="Age"
              placeholder="age"
              value={age}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              enterKeyHint="done"
              onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 2))}
            />
            .
            </span>
          </Line>
          <Sub live className="min-h-6 text-[17px]">
            {young ? "Pods is 18 and up." : old ? `Pods is ${minAge} to ${maxAge}.` : ""}
          </Sub>
          <button type="submit" hidden />
        </form>
      }
      object={<SeatTable size={size} initial={initial} />}
      dot={DOT.you}
      hint={ok ? undefined : !name.trim() ? "Type your first name." : n === null ? "Add your age." : undefined}
      action={
        <Button size="xl" disabled={!ok} onClick={next}>
          Next
        </Button>
      }
    />
  );
}
