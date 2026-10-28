// Switch (Radix), v3: ink track when on, lit paper thumb. Prefer a sentence row ("Texts when it's on.") over a toggle wall.
"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { Switch as RSwitch } from "radix-ui";
import { cn } from "@/lib/cn";

export const Switch = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<typeof RSwitch.Root>>(function Switch({ className, ...rest }, ref) {
  return (
    <RSwitch.Root
      ref={ref}
      className={cn(
        "group relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-pill p-[2px] outline-offset-2",
        "bg-line-2 transition-colors duration-base ease-standard",
        "data-[state=checked]:bg-teal",
        "disabled:cursor-not-allowed disabled:opacity-45",
        "after:absolute after:-inset-1.5 after:content-['']",
        className,
      )}
      {...rest}
    >
      <RSwitch.Thumb
        className={cn(
          "block size-[27px] rounded-full bg-lit shadow-[0_1px_0_rgba(14,26,34,.2)]",
          "transition-transform duration-base ease-spring data-[state=checked]:translate-x-5",
          "group-active:w-[31px] group-data-[state=checked]:group-active:-ml-1",
        )}
      />
    </RSwitch.Root>
  );
});
