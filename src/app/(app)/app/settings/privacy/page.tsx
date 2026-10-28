// Settings are folded into Your seat sheets (V3_SPEC §6.5); the route is kept and lands on its sheet.
import { redirect } from "next/navigation";

/** A redirect has nothing to show instantly; let it block (docs: instant-navigation, opting out). */
export const instant = false;

export default function Page() {
  redirect("/app/profile?sheet=privacy");
}
