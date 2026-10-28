"use client";

import { Stage } from "@/components/brand/stage";
import { Bubble } from "@/components/brand/bubble";
import { Disc } from "@/components/brand/disc";
import { ProductStory } from "@/components/brand/product-story";

export function StoryLab() {
  return (
    <>
      <Stage light="paper" />
      <header className="mx-auto flex min-h-[60svh] max-w-[1200px] flex-col justify-end px-gutter pb-s16 lg:px-s16" data-lab="hero">
        <h1 className="max-w-[12ch] text-[clamp(3rem,2.4rem+2.4vw,4.5rem)] leading-[1.04] font-semibold tracking-[-0.03em]">
          Saved you a seat.
        </h1>
        <p className="mt-s4 text-[17px] text-ink-2">Small friend groups that meet again.</p>
      </header>
      <ProductStory />
      <section className="mx-auto max-w-[1200px] px-gutter py-s24 lg:px-s16" data-lab="bubbles">
        <p className="text-[13px] font-medium text-ink-2">Bubble vs disc</p>
        <div className="mt-s6 flex flex-wrap items-center gap-s8">
          <div className="relative h-[200px] w-[230px]">
            <span className="absolute top-0 left-[48px]"><Bubble hue="ember" size={130} dot="top" buoy={0} /></span>
            <span className="absolute top-[76px] left-0"><Bubble hue="signal" size={130} dot="left" buoy={2} /></span>
            <span className="absolute top-[76px] left-[96px]"><Bubble hue="grove" size={130} dot="right" buoy={4} /></span>
          </div>
          <div className="flex items-center gap-s3">
            <Bubble hue="ember" size={56} dot="center" solo />
            <Bubble hue="signal" size={56} dot="center" solo />
            <Bubble hue="grove" size={56} dot="center" solo />
            <Bubble hue="teal" size={56} dot="center" solo />
          </div>
          <div className="flex items-center gap-s3">
            <Disc size={56} tone="you" />
            <Disc size={56} seed="a" />
            <Disc size={56} seed="b" />
          </div>
        </div>
      </section>
    </>
  );
}
