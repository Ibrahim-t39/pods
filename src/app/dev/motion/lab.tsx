"use client";

import { useState } from "react";
import { CirclesLoader, CirclesSkeleton, Disc, InCount, PlanHalo, PullCircles, Stage } from "@/components/brand";
import { CondensingHead } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { NumberTicker } from "@/components/ui/number-ticker";

export function MotionLab() {
  const [n, setN] = useState(3);
  const [pulls, setPulls] = useState(0);
  return (
    <>
      <Stage light="paper" />
      <PullCircles onRefresh={() => new Promise((r) => setTimeout(() => { setPulls((p) => p + 1); r(null); }, 1200))} />
      <div aria-hidden className="scroll-field pointer-events-none fixed -top-24 -right-24 -z-10 size-[420px] rounded-full bg-venn opacity-40 blur-3xl" />
      <CondensingHead title="Motion lab." left="back" backHref="/" />
      <main className="px-gutter pb-s24 lg:px-s16">
        <section className="mt-s12 flex items-center gap-s8">
          <CirclesLoader size={96} label="Loading" />
          <CirclesSkeleton />
        </section>
        <section className="mt-s12" data-lab="halo">
          <PlanHalo state={n >= 4 ? "locked" : "waiting"} radius={24}>
            <div className="rounded-[24px] bg-white p-s6 shadow-[var(--shadow-float)]">
              <p className="text-label text-ink-2">Pickup</p>
              <p className="mt-s1 text-[28px] font-semibold tracking-[-0.02em]">Saturday, <span className="tabular">10am</span></p>
              <p className="mt-s1 text-ink-2">Miller Playfield · Free</p>
              <div className="mt-s4"><InCount n={n + 0} of={8} locked={n >= 4} /></div>
            </div>
          </PlanHalo>
        </section>
        <section className="settle mt-s16 flex items-center gap-s6">
          <span className="text-display font-semibold tabular">
            <span key={n} className="pods-tick">{n}</span> in
          </span>
          <NumberTicker value={n} className="text-display font-semibold" />
          <Button onClick={() => setN((v) => (v >= 4 ? 1 : v + 1))}>I&apos;m in</Button>
        </section>
        <section className="settle mt-s16 flex gap-s3">
          {Array.from({ length: n }, (_, i) => (
            <span key={i} className="pods-pop-in" style={{ animationDelay: `${i * 60}ms` }}>
              <Disc tone={i === 0 ? "you" : "signal"} seed={`p${i}`} size={48} />
            </span>
          ))}
        </section>
        <section className="settle mt-s16 h-[60vh] rounded-[28px] glass p-s8">
          <p className="text-label text-ink-2">Pulled {pulls}</p>
        </section>
        <section className="settle mt-s16 h-[60vh] rounded-[28px] bg-sunken" />
      </main>
    </>
  );
}
