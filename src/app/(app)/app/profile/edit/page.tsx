// The old profile editor is folded into Your seat: likes and the photo live in the likes sheet.
import { redirect } from "next/navigation";

/** A redirect has nothing to show instantly; let it block (docs: instant-navigation, opting out). */
export const instant = false;

export default function Page() {
  redirect("/app/profile?sheet=likes");
}
