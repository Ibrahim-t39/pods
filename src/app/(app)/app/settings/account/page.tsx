// /app/settings/account lands on its place in Settings (QA round 1).
import { redirect } from "next/navigation";

/** A redirect has nothing to show instantly; let it block (docs: instant-navigation, opting out). */
export const instant = false;

export default function Page() {
  redirect("/app/settings");
}
