// Switch (Radix), v3: ink track when on, lit paper thumb. Prefer a sentence row ("Texts when it's on.") over a toggle wall.
// QA r1: the control itself is 44px tall (the 31px track is drawn by ::before), so the tap target meets 44px.
"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { Switch as RSwitch } from "radix-ui";
import { cn } from "@/lib/cn";

export const Switch = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<typeof RSwitch.Root>>(function Switch({ className, ...rest }, ref) {
  return (
    <RSwitch.Root
      ref={ref}
      className={cn(
        "group relative inline-flex h-11 w-[51px] shrink-0 items-center rounded-pill px-[2px] outline-offset-2",
        "before:absolute before:inset-x-0 before:top-1/2 before:h-[31px] before:-translate-y-1/2 before:rounded-pill before:content-['']",
        "before:bg-line-2 before:transition-colors before:duration-base before:ease-standard",
        "data-[state=checked]:before:bg-teal",
        "disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...rest}
    >
      <RSwitch.Thumb
        className={cn(
          "relative block size-[27px] rounded-full bg-lit shadow-[0_1px_0_rgba(14,26,34,.2)]",
          "transition-transform duration-base ease-spring data-[state=checked]:translate-x-5",
          "group-active:w-[31px] group-data-[state=checked]:group-active:-ml-1",
        )}
      />
    </RSwitch.Root>
  );
});
