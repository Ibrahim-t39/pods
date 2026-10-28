// [U8] Sign out helper for Settings › Account (see signOutLocal in db/local/profile.ts).
import { ctx } from "@/lib/db/local/context";
import { signOutLocal } from "@/lib/db/local/profile";

export function signOut() {
  signOutLocal(ctx);
}
