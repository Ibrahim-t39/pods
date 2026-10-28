// B05 / B06 / B06e Keep your seat, and Y04 / Y05 Welcome back (sign in). The number is the first check: a text code
// (H #3). "Keep your seat." with the number in one large field, then "Code sent." with six circles that fill as you
// type (PB 2.7; SF 19). Six digits submit on their own. Wrong: "Not that one." and a shake (designer R1 #5).
// No password, no "any 6 digits" hint, no provider buttons. The city comes from the number; "Not here?" opens the
// one city picker (V3_SPEC §6.2).
// On the code: the draft (name, age, likes, free, community) is committed through the Repo, then Promise.
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Line } from "@/components/brand/line";
import { Button } from "@/components/ui/button";
import { useDb, useRepo } from "@/lib/db/hooks";
import type { User } from "@/lib/types";
import { FlowStep, GoLink, Sub, useTableSize } from "../flow";
import { SeatTable } from "../objects";
import { useDraft } from "../draft";
import { Guarded } from "../guard";
import { BACK, STEP_ROUTE, commitDraft, firstOpenDraftStep, resumeRoute } from "../steps";

export function SeatScreen({ signin }: { signin?: boolean }) {
  const params = useSearchParams();
  const mode = signin || params.get("mode") === "signin";
  return <Guarded need="none">{(me) => <Seat signin={mode} me={me} />}</Guarded>;
}

const fmt = (d: string) => {
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)} ${d.slice(6, 10)}`;
};

function Seat({ signin, me }: { signin: boolean; me: User | null }) {
  const router = useRouter();
  const repo = useRepo();
  const { size } = useTableSize();
  const draft = useDraft();
  const metro = useDb((db) => db.config.placement.metro);
  const [stage, setStage] = useState<"number" | "code">("number");
  const [digits, setDigits] = useState("");
  const [challenge, setChallenge] = useState("");
  const [code, setCode] = useState("");
  const [wrong, setWrong] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const phoneRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  // Already holding a seat on this device: this step is done.
  useEffect(() => {
    if (me && stage === "number") router.replace(resumeRoute(me));
  }, [me, stage, router]);

  useEffect(() => {
    const t = setTimeout(() => (stage === "number" ? phoneRef : codeRef).current?.focus({ preventScroll: true }), 360);
    return () => clearTimeout(t);
  }, [stage]);

  const send = async () => {
    if (digits.length !== 10 || busy) return;
    setBusy(true);
    setMsg(null);
    const r = await repo.startPhoneAuth(`+1${digits}`);
    setBusy(false);
    if (!r.ok) return setMsg("Check the number.");
    setChallenge(r.data.challengeId);
    setCode("");
    setWrong(0);
    setStage("code");
  };

  const finish = async (user: User) => {
    if (user.first_name || signin) {
      // A returning seat: pick up where it was.
      return router.push(user.first_name ? resumeRoute(user) : STEP_ROUTE[firstOpenDraftStep(useDraft.getState()) ?? "promise"]);
    }
    if (firstOpenDraftStep(useDraft.getState())) return router.push(resumeRoute(user));
    const r = await commitDraft(repo, metro);
    if (!r.ok) {
      if (r.code === "UNDERAGE") return draft.set({ minorBlocked: true });
      if (r.code === "OUT_OF_METRO") return router.push("/app/onboarding/city");
      setBusy(false);
      return setMsg("Not saved. Try again.");
    }
    useDraft.getState().set({ firstName: "", age: null, interests: [], free: [], heritage: null, faith: null });
    router.push(STEP_ROUTE.promise);
  };

  const verify = async (c: string) => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    const r = await repo.verifyPhoneCode(challenge, c);
    if (!r.ok) {
      setBusy(false);
      const e = r.error as { code: string; field?: string };
      if (e.code === "UNDERAGE") return draft.set({ minorBlocked: true });
      if (e.code === "BANNED") return setMsg("This number can't hold a seat.");
      setWrong((n) => n + 1);
      setCode("");
      setMsg(e.field === "locked" ? "Too many tries. Get a new code." : null);
      requestAnimationFrame(() => codeRef.current?.focus());
      return;
    }
    await finish(r.data);
  };

  const again = async () => {
    setCode("");
    setWrong(0);
    setMsg(null);
    const r = await repo.startPhoneAuth(`+1${digits}`);
    if (r.ok) setChallenge(r.data.challengeId);
    setMsg("Sent again.");
    codeRef.current?.focus();
  };

  const initial = (draft.firstName || me?.first_name || "").slice(0, 1).toUpperCase();
  const object = <SeatTable size={size} initial={signin ? undefined : initial} />;

  if (stage === "code") {
    const bad = wrong > 0;
    return (
      <FlowStep
        screen="code"
        back={false}
        label="Code"
        head={
          <>
            <Line size="lg">{bad ? "Not that one." : "Code sent."}</Line>
            <Sub>
              {bad ? (
                "Try again, or get a new code."
              ) : (
                <>
                  to <span data-nc>{fmt(digits)}</span>
                </>
              )}
            </Sub>
            <label className="pods-ob-code mt-s8">
              <span className="sr-only">Code</span>
              <input
                ref={codeRef}
                value={code}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                aria-describedby="ob-code-msg"
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(v);
                  if (v.length === 6) void verify(v);
                }}
              />
              <span key={wrong} className="pods-ob-dots" data-wrong={bad && !code.length ? "" : undefined} aria-hidden>
                {Array.from({ length: 6 }, (_, i) => (
                  <i key={i} data-on={i < code.length ? "" : undefined} data-at={i === code.length && !busy ? "" : undefined}>
                    {code[i] ?? ""}
                  </i>
                ))}
              </span>
            </label>
            <p id="ob-code-msg" aria-live="polite" className="mt-s4 min-h-6 text-label text-ink-2">
              {msg}
            </p>
            <div className="flex gap-s6">
              <GoLink onClick={again}>Send again</GoLink>
              <GoLink
                onClick={() => {
                  setStage("number");
                  setMsg(null);
                }}
              >
                Change number
              </GoLink>
            </div>
          </>
        }
        object={object}
      />
    );
  }

  return (
    <FlowStep
      screen="number"
      back={signin ? "/" : BACK.seat}
      label={signin ? "Sign in" : "Keep your seat"}
      head={
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <Line size="lg" className="max-w-[9ch]">
            {signin ? "Welcome back." : "Keep your seat."}
          </Line>
          {!signin && <Sub>A text code holds it.</Sub>}
          <label className="mt-s8 block">
            <span className="sr-only">Phone number</span>
            <input
              ref={phoneRef}
              className="pods-ob-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(555) 014 2290"
              value={fmt(digits)}
              onChange={(e) => {
                setDigits(e.target.value.replace(/\D/g, "").replace(/^1(?=\d{10})/, "").slice(0, 10));
                setMsg(null);
              }}
            />
          </label>
          <p aria-live="polite" className="mt-s2 min-h-6 text-label text-ink-2">
            {msg}
          </p>
        </form>
      }
      object={object}
      status={!signin ? <GoLink href="/app/onboarding/city">Not here?</GoLink> : <GoLink href={STEP_ROUTE.you}>New here</GoLink>}
      action={
        <Button size="xl" disabled={digits.length !== 10} loading={busy} onClick={send}>
          Send code
        </Button>
      }
    />
  );
}
