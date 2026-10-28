// The old safety settings route lands on If something's off (/app/safety, V3_SPEC §6.5, PLATFORM_SPEC §F9).
import { redirect } from "next/navigation";

/** A redirect has nothing to show instantly; let it block (docs: instant-navigation, opting out). */
export const instant = false;

export default function Page() {
  redirect("/app/safety");
}
