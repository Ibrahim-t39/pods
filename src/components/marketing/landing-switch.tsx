"use client";
// A small pill on both landings so the team can compare them: Film (/) and Classic (/classic).
// The × hides it for this visit only (component state, not stored), so a refresh shows it again.
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./landing-switch.css";

const VERSIONS = [
  { href: "/", label: "Film" },
  { href: "/classic", label: "Classic" },
];

export function LandingSwitch() {
  const path = usePathname();
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <nav aria-label="Landing version" className="landing-switch">
      {VERSIONS.map((v) => (
        <Link key={v.href} href={v.href} aria-current={path === v.href ? "page" : undefined}>
          {v.label}
        </Link>
      ))}
      <button type="button" className="landing-switch-x" aria-label="Hide version switch" onClick={() => setHidden(true)}>
        ×
      </button>
    </nav>
  );
}
