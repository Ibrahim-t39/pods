// /waitlist as a flow step (V3_SPEC §6.1.3; template anatomy A). One line, one sentence whose city is an underlined
// quiet control (call graft: underlined words as controls), one number field, one pill. The object is the Doorway's own
// three circles (COLOR_LIFE §12.1): apart while Pods is not near you yet, drifting into their overlap once you are on
// the list (the story's "fit" beat, 700 ms, the `light` duration). Reduced motion: they simply rest in place.
// The city field is the only place a city name may appear (data-allow-city). Nothing is sent to a third party:
// the entry is kept in this browser until the texting provider is wired (launch item, not a label).
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { animate, useMotionValue } from "motion/react";
import { VennStory } from "@/components/brand/venn-story";
import { useCalmMotion } from "@/components/brand/motion";
import { Line } from "@/components/brand/line";
import { Stage } from "@/components/brand/stage";
import { Chrome } from "@/components/shell/chrome";
import { Page } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { formatUsPhone } from "@/components/ui/phone-input";
import "@/components/shell/shell.css";
import "./doorway.css";
import "./waitlist.css";

const KEY = "pods:waitlist";

function remember(id: string): "new" | "again" {
  try {
    const list = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as string[];
    if (list.includes(id)) return "again";
    window.localStorage.setItem(KEY, JSON.stringify([...list, id]));
  } catch {
    /* storage blocked: the done state still shows */
  }
  return "new";
}

export function WaitlistScreen() {
  const params = useSearchParams();
  const age = params.get("reason") === "age";
  const [city, setCity] = useState(params.get("city") ?? "");
  const [digits, setDigits] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const reduced = useCalmMotion();
  // the story's own scale: 0.04 three worlds apart, 0.3 they fit (VennStory P)
  const story = useMotionValue(0.04);
  useEffect(() => {
    const to = done ? 0.3 : 0.04;
    if (reduced) {
      story.set(to);
      return;
    }
    const c = animate(story, to, { duration: 0.7, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [done, reduced, story]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (digits.length !== 10) {
      setError("Ten digits, please.");
      return;
    }
    setError(null);
    remember(digits);
    setDone(true);
  };

  return (
    <>
      <Stage light={done ? "clear" : "paper"} />
      <Page
        label="Waitlist"
        chrome={<Chrome left="back" backHref="/" />}
        head={
          done ? (
            <>
              <Line size="lg">On the list.</Line>
              <p className="wl-sub text-ink-2">We&apos;ll text you.</p>
            </>
          ) : (
            <>
              <Line size="lg" className="max-w-[9ch]">
                {age ? "Pods is 18 to 29." : "Not here yet."}
              </Line>
              <p className="wl-sub text-ink-2">
                {age ? "We'll text you if that changes." : "We'll text when it opens in "}
                {!age && (
                  <label className="wl-city" data-allow-city>
                    <span className="sr-only">Your city</span>
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="your city"
                      autoComplete="address-level2"
                    />
                  </label>
                )}
                {!age && "."}
              </p>
            </>
          )
        }
        object={
          <div className="wl-obj" data-done={done ? "" : undefined}>
            <VennStory progress={story} reduced={reduced} className="wl-venn" />
          </div>
        }
        foot={
          done ? (
            <Button asChild size="xl" className="wl-done">
              <Link href="/">Back to Pods</Link>
            </Button>
          ) : (
            <form onSubmit={submit} noValidate className="wl-form" aria-label="Waitlist">
              <label className="wl-field" data-error={error ? "" : undefined}>
                <span className="sr-only">Your number</span>
                <input
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="Phone"
                  value={formatUsPhone(digits)}
                  onChange={(e) => {
                    setDigits(e.target.value.replace(/\D/g, "").slice(0, 10));
                    setError(null);
                  }}
                  aria-invalid={!!error}
                  aria-describedby={error ? "wl-err" : undefined}
                />
              </label>
              {error && (
                <p id="wl-err" role="alert" className="wl-err text-label text-ink">
                  {error}
                </p>
              )}
              <Button type="submit" size="xl" className="wl-pill">
                Text me
              </Button>
            </form>
          )
        }
      />
    </>
  );
}
