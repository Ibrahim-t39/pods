// [U1] VisuallyHidden: text for assistive tech only.
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

export function VisuallyHidden({ className, ...rest }: ComponentPropsWithoutRef<"span">) {
  return <span className={cn("sr-only", className)} {...rest} />;
}
