"use client";
// A small pill so the team can compare the landings: Film (/) and Classic (/classic). Team-only: it shows only with
// ?compare=1 in the URL (the links keep it), so visitors never see it. The × hides it for this visit.
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./landing-switch.css";

const VERSIONS = [
  { href: "/", label: "Film" },
  { href: "/classic", label: "Classic" },
];

/** the switch is on only for ?compare=1 */
export const compareOn = (search: string) => new URLSearchParams(search).get("compare") === "1";

export function LandingSwitch() {
  const path = usePathname();
  const [hidden, setHidden] = useState(false);
  // read after mount (no useSearchParams, so the landings stay static); off on the server and first paint
  const [on, setOn] = useState(false);
  useEffect(() => setOn(compareOn(window.location.search)), [path]);
  if (hidden || !on) return null;
  return (
    <nav aria-label="Landing version" className="landing-switch">
      {VERSIONS.map((v) => (
        <Link key={v.href} href={`${v.href}?compare=1`} aria-current={path === v.href ? "page" : undefined}>
          {v.label}
        </Link>
      ))}
      <button type="button" className="landing-switch-x" aria-label="Hide version switch" onClick={() => setHidden(true)}>
        ×
      </button>
    </nav>
  );
}
