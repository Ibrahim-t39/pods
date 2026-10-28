// Settings routes only redirect into Your seat sheets now (V3_SPEC §6.5); the layout is a pass-through.
import type { ReactNode } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return children;
}
