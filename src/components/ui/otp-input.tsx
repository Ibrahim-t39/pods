// [U1] OtpInput: one real input (autocomplete=one-time-code, so iOS / Android autofill works) under 6 visual
// boxes 48×56. Paste fills all. States: typing, complete (onComplete fires once), error (M22 shake + red),
// expired, locked (disabled).
"use client";

import "./ui.css";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type OtpState = "idle" | "error" | "expired" | "locked" | "success";

export interface OtpInputProps {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  length?: number;
  state?: OtpState;
  autoFocus?: boolean;
  label?: string;
  className?: string;
  describedBy?: string;
}

export const OtpInput = forwardRef<HTMLInputElement, OtpInputProps>(function OtpInput(
  { value, onChange, onComplete, length = 6, state = "idle", autoFocus, label = "Verification code", className, describedBy },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inputRef.current!);
  const [focused, setFocused] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const disabled = state === "locked" || state === "expired";

  useEffect(() => {
    if (state === "error") setShakeKey((k) => k + 1);
  }, [state]);

  const set = (raw: string) => {
    const v = raw.replace(/\D/g, "").slice(0, length);
    onChange(v);
    if (v.length === length && value.length !== length) onComplete?.(v);
  };

  const active = Math.min(value.length, length - 1);
  return (
    <div className={cn("relative w-fit", className)}>
      <div key={shakeKey} className={cn("flex gap-2 sm:gap-2.5", state === "error" && shakeKey > 0 && "animate-shake motion-reduce:animate-none")}>
        {Array.from({ length }, (_, i) => {
          const ch = value[i];
          const isActive = focused && !disabled && i === active && value.length < length + 1;
          return (
            <div
              key={i}
              aria-hidden
              className={cn(
                "relative grid h-14 w-12 place-items-center rounded-input border bg-surface font-display text-[26px] font-extrabold tabular text-fg shadow-xs",
                "transition-[border-color,box-shadow,background-color] duration-fast ease-standard",
                state === "error"
                  ? "border-danger bg-danger-soft"
                  : state === "success"
                    ? "border-success-border bg-success-soft text-success-text"
                    : isActive
                      ? "border-focus-ring shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-focus-ring)_22%,transparent)]"
                      : ch
                        ? "border-border-strong"
                        : "border-border",
                disabled && "bg-sunken text-fg-subtle",
              )}
            >
              {ch ?? ""}
              {isActive && !ch && <span className="h-6 w-0.5 animate-[pods-caret_1s_steps(1)_infinite] rounded-full bg-primary motion-reduce:animate-none" />}
            </div>
          );
        })}
      </div>
      <input
        ref={inputRef}
        aria-label={label}
        aria-describedby={describedBy}
        aria-invalid={state === "error" || undefined}
        autoComplete="one-time-code"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={length}
        autoFocus={autoFocus}
        disabled={disabled}
        value={value}
        onChange={(e) => set(e.target.value)}
        onPaste={(e) => {
          e.preventDefault();
          set(e.clipboardData.getData("text"));
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent opacity-0 outline-none selection:bg-transparent"
      />
    </div>
  );
});
