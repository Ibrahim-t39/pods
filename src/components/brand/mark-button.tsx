// The mark (three circles) as the top-left glyph (DESIGN.md §5 chrome contract):
//   - tap: home (Your pods) or the href given
//   - press and hold 700 ms: opens the Director. The hold is caught at the document level by the Director
//     (director-panel.tsx matches [data-mark]) and the click that follows is swallowed, so this stays a plain link.
// The hold never shows a hint, a ring or a tooltip.
"use client";

import Link from "next/link";
import { LogoMark } from "./logo";

export function MarkButton({ href = "/app/pods", label = "Your pods", size = 28 }: { href?: string; label?: string; size?: number }) {
  return (
    <Link
      href={href}
      aria-label={label}
      data-mark
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      className="inline-flex size-11 items-center justify-center rounded-full outline-offset-2"
      style={{ WebkitTouchCallout: "none", userSelect: "none", WebkitUserSelect: "none", touchAction: "manipulation" }}
    >
      <LogoMark size={size} title="" />
    </Link>
  );
}
