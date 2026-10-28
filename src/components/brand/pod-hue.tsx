// [U1] PodHue: scope a subtree to a pod's colour family. Sets data-pod-hue so every --pod-* token (and the
// Tailwind classes bg-pod, bg-pod-soft, text-pod-text, border-pod-soft-border, bg-pod-gloss, shadow-glow-pod)
// resolves to Ember (interest), Grove (community) or Signal (Pods itself). Also exposes the hue via context.
"use client";

import { createContext, useContext, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { Slot } from "radix-ui";
import { cn } from "@/lib/cn";

export type PodHueName = "ember" | "grove" | "signal";

const PodHueContext = createContext<PodHueName>("signal");

/** The hue of the nearest PodHue ("signal" outside any pod). */
export function usePodHue(): PodHueName {
  return useContext(PodHueContext);
}

/** interest → ember, community → grove (tokens.json podHues). */
export function hueForPodType(type: "interest" | "community" | string | undefined): PodHueName {
  return type === "community" ? "grove" : type === "interest" ? "ember" : "signal";
}

export interface PodHueProps extends ComponentPropsWithoutRef<"div"> {
  hue: PodHueName;
  /** Render onto the single child instead of a wrapper div. */
  asChild?: boolean;
  children?: ReactNode;
}

export function PodHue({ hue, asChild, className, children, ...rest }: PodHueProps) {
  const Comp = asChild ? Slot.Root : "div";
  return (
    <PodHueContext.Provider value={hue}>
      <Comp data-pod-hue={hue} className={cn(className)} {...rest}>
        {children}
      </Comp>
    </PodHueContext.Provider>
  );
}
