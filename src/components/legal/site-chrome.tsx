// The marketing pages' own chrome (QA r1): the logo (home) on the left and a plain "Back" on the right, the same on
// /privacy, /safety, /terms and /waitlist; plus one shared footer of the four pages, the current one marked, never
// linked to itself. Replaces the round-arrow back glyph, which read as "refresh" outside the app.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Icon } from "@/components/icons";
import "./site-chrome.css";

export const SITE_PAGES = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/safety", label: "If something's off" },
  { href: "/waitlist", label: "Waitlist" },
] as const;

export type SitePage = (typeof SITE_PAGES)[number]["href"];

export function SiteBar() {
  const router = useRouter();
  return (
    <header className="sc-bar">
      <Link href="/" aria-label="Pods, home" className="sc-logo pressable">
        <Logo variant="horizontal" title="" className="h-6 w-auto" />
      </Link>
      <button
        type="button"
        className="sc-back pressable"
        onClick={() => {
          if (window.history.length > 1) router.back();
          else router.push("/");
        }}
      >
        <Icon name="arrow" size={18} aria-hidden className="sc-back-ico" />
        Back
      </button>
    </header>
  );
}

export function SiteFoot({ here }: { here: SitePage }) {
  return (
    <footer className="sc-foot">
      <nav aria-label="Pods pages" className="sc-foot-links">
        {SITE_PAGES.map((p) =>
          p.href === here ? (
            <span key={p.href} aria-current="page" className="sc-foot-a" data-here="">
              {p.label}
            </span>
          ) : (
            <Link key={p.href} href={p.href} className="sc-foot-a">
              {p.label}
            </Link>
          ),
        )}
      </nav>
      <p className="sc-foot-c">© 2026 Pods</p>
    </footer>
  );
}
