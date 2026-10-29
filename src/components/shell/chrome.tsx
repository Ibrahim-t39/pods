// <Chrome>: the one top row (DESIGN.md §5 chrome contract, wireframes kit.mjs). One glyph per job, same place on
// every screen; no title in the bar (the page's serif line is the title).
//
//   left   "mark"  the three circles = Your pods (and the hidden 700 ms Director hold)
//          "back"  the back glyph (a dot leaving the ring): first run, Your seat, legal
//          "none"
//   right  "seat"  your disc = Your seat (/app/profile)
//          "menu"  three small circles: opens the page's one menu sheet (pass onMenu)
//          any node (e.g. "Sign in" text link on the Doorway)
//
// Phone: 44px row at 16px from the top, 20px gutter. Laptop: 32px from the top, 64px margin.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/icons";
import { MarkButton } from "@/components/brand/mark-button";
import { useMe } from "@/lib/db/hooks";

export interface ChromeProps {
  left?: "mark" | "back" | "none";
  /** where back goes; default = history back, falling back to /app/pods */
  backHref?: string;
  backLabel?: string;
  right?: "seat" | "menu" | "none" | ReactNode;
  onMenu?: () => void;
  menuLabel?: string;
  /** centre slot (rare: Talk's people row). Never a page title. */
  center?: ReactNode;
  /** sit over the night stage (lamp-coloured glyphs) */
  night?: boolean;
  className?: string;
}

export function Chrome({ left = "mark", backHref, backLabel = "Back", right = "none", onMenu, menuLabel = "Menu", center, night, className }: ChromeProps) {
  return (
    <header
      data-chrome-row
      className={cn(
        "relative z-header mx-auto flex h-11 w-full max-w-[1440px] items-center justify-between",
        "mt-[calc(env(safe-area-inset-top)+16px)] px-gutter lg:mt-8 lg:px-s16",
        night ? "text-lamp" : "text-ink",
        className,
      )}
    >
      <div className="flex min-w-11 items-center">
        {left === "mark" && <MarkButton />}
        {left === "back" && <BackGlyph href={backHref} label={backLabel} />}
      </div>
      {center && <div className="absolute left-1/2 -translate-x-1/2">{center}</div>}
      <div className="flex min-w-11 items-center justify-end">
        {right === "seat" ? <SeatGlyph /> : right === "menu" ? <GlyphButton icon="more" label={menuLabel} onClick={onMenu} /> : right === "none" ? null : right}
      </div>
    </header>
  );
}

export function GlyphButton({ icon, label, onClick, className }: { icon: Parameters<typeof Icon>[0]["name"]; label: string; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn("pressable inline-flex size-11 items-center justify-center rounded-full outline-offset-2 hover:bg-[color-mix(in_srgb,currentColor_8%,transparent)]", className)}
    >
      <Icon name={icon} />
    </button>
  );
}

function BackGlyph({ href, label }: { href?: string; label: string }) {
  const router = useRouter();
  const cls = "pressable inline-flex size-11 items-center justify-center rounded-full outline-offset-2";
  if (href)
    return (
      <Link href={href} aria-label={label} className={cls}>
        <Icon name="back" />
      </Link>
    );
  return (
    <button
      type="button"
      aria-label={label}
      className={cls}
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push("/app/pods");
      }}
    >
      <Icon name="back" />
    </button>
  );
}

/** Your disc, top right: Your seat (hidden where the navigation already carries you). */
export function SeatGlyph() {
  const me = useMe();
  const initial = (me?.first_name ?? "").slice(0, 1).toUpperCase();
  return (
    <Link href="/app/profile" aria-label="Your profile" data-seat className="pressable inline-flex size-11 items-center justify-center rounded-full outline-offset-2">
      <span data-nc className="grid size-9 place-items-center rounded-full bg-spark text-[17px] leading-none font-semibold text-on-spark">
        {initial}
      </span>
    </Link>
  );
}
