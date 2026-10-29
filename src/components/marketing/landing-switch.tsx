"use client";
// A small pill on both landings so the team can compare them: Film (/) and Classic (/classic).
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./landing-switch.css";

const VERSIONS = [
  { href: "/", label: "Film" },
  { href: "/classic", label: "Classic" },
];

export function LandingSwitch() {
  const path = usePathname();
  return (
    <nav aria-label="Landing version" className="landing-switch">
      {VERSIONS.map((v) => (
        <Link key={v.href} href={v.href} aria-current={path === v.href ? "page" : undefined}>
          {v.label}
        </Link>
      ))}
    </nav>
  );
}
