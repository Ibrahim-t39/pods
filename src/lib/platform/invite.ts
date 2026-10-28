// Platform §F7: invite links. /i/<code> saves the code on this device and sends the visitor into first run; once
// placed, the placing screen calls repo.redeemInvite(takePendingInvite()). Local build: a code redeems only where the
// inviter's data lives (same browser), so a miss is silent and normal placement holds.
export const PENDING_INVITE_KEY = "pods:invite";

export function inviteUrl(origin: string, code: string): string {
  return `${origin.replace(/\/$/, "")}/i/${encodeURIComponent(code)}`;
}

export function isInviteCode(s: string): boolean {
  return /^[A-Za-z0-9]{6,16}$/.test(s);
}

export function savePendingInvite(code: string): void {
  if (!isInviteCode(code)) return;
  try {
    window.localStorage.setItem(PENDING_INVITE_KEY, code);
  } catch {
    /* ignore */
  }
}

/** Read and clear. */
export function takePendingInvite(): string | null {
  try {
    const v = window.localStorage.getItem(PENDING_INVITE_KEY);
    window.localStorage.removeItem(PENDING_INVITE_KEY);
    return v && isInviteCode(v) ? v : null;
  } catch {
    return null;
  }
}
