// [U1] PhoneInput: country code chip (+1 default, Zambia +260 and a few others) + formatted number field.
// Value is digits only (no country code); `onCountryChange` reports the dial code. inputmode=tel, autocomplete=tel.
"use client";

import { forwardRef, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { Field, controlClass } from "./field";

export const COUNTRIES = [
  { code: "US", dial: "+1", name: "United States" },
  { code: "CA", dial: "+1", name: "Canada" },
  { code: "ZM", dial: "+260", name: "Zambia" },
  { code: "ZW", dial: "+263", name: "Zimbabwe" },
  { code: "ZA", dial: "+27", name: "South Africa" },
  { code: "NG", dial: "+234", name: "Nigeria" },
  { code: "GH", dial: "+233", name: "Ghana" },
  { code: "KE", dial: "+254", name: "Kenya" },
  { code: "JM", dial: "+1", name: "Jamaica" },
  { code: "GB", dial: "+44", name: "United Kingdom" },
] as const;

export function formatUsPhone(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export interface PhoneInputProps {
  value: string;
  onChange: (digits: string) => void;
  country?: string;
  onCountryChange?: (code: string, dial: string) => void;
  label?: ReactNode;
  helper?: ReactNode;
  error?: ReactNode;
  disabled?: boolean;
  id?: string;
  className?: string;
  autoFocus?: boolean;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  { value, onChange, country = "US", onCountryChange, label = "Phone number", helper, error, disabled, id, className, autoFocus },
  ref,
) {
  const c = COUNTRIES.find((x) => x.code === country) ?? COUNTRIES[0];
  const nanp = c.dial === "+1";
  return (
    <Field id={id} label={label} helper={helper} error={error} className={className}>
      {({ id, describedBy, invalid }) => (
        <div className="flex gap-2">
          <label className="relative">
            <span className="sr-only">Country code</span>
            <select
              value={c.code}
              disabled={disabled}
              onChange={(e) => {
                const n = COUNTRIES.find((x) => x.code === e.target.value)!;
                onCountryChange?.(n.code, n.dial);
              }}
              className={cn(controlClass, "h-[52px] w-[104px] appearance-none pr-8 pl-3.5 font-medium tabular")}
            >
              {COUNTRIES.map((x) => (
                <option key={x.code} value={x.code}>
                  {x.code} {x.dial}
                </option>
              ))}
            </select>
            <Icon name="arrow" size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rotate-90 text-ink-2" />
          </label>
          <input
            ref={ref}
            id={id}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            autoFocus={autoFocus}
            disabled={disabled}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            placeholder={nanp ? "(206) 555-0142" : "Phone number"}
            value={nanp ? formatUsPhone(value) : value}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, nanp ? 10 : 12))}
            className={cn(controlClass, "h-[52px] flex-1 tabular tracking-[0.01em]")}
          />
        </div>
      )}
    </Field>
  );
});
