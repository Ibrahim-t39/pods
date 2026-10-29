// [U8] Sign out helper for Settings › Account and the You page (see signOutLocal in db/local/profile.ts).
// Signing out or deleting an account also wipes this person's leftovers on the device, so the next "Get started"
// starts clean (founder: old sign-in answers were resuming mid-flow). Device-level settings stay (theme, mode,
// install hint), and so does the under-18 block, which is a safety measure.
import { ctx } from "@/lib/db/local/context";
import { signOutLocal } from "@/lib/db/local/profile";
import { useDraft } from "@/components/onboarding/draft";

const PERSONAL_KEYS = ["pods:seat-prefs", "pods:inbox-seen", "pods:invite", "pods:details-collapsed"];

/** Clear the sign-up draft and per-person preferences stored in this browser. */
export function wipeLocalPersonal() {
  const blocked = useDraft.getState().minorBlocked; // the under-18 stop survives sign-out
  useDraft.getState().clear();
  if (blocked) useDraft.getState().set({ minorBlocked: true });
  try {
    for (const k of PERSONAL_KEYS) localStorage.removeItem(k);
  } catch {
    // storage blocked (private mode): nothing to clear
  }
}

/** Where signing out lands: Welcome back (sign in by number), never a sign-up step. */
export const SIGNED_OUT_HREF = "/app/welcome";

export function signOut() {
  signOutLocal(ctx);
  wipeLocalPersonal();
}
