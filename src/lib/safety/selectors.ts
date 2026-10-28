// [U8] Pure read helpers for safety state. Cross-unit contract: U7 uses these in chat/pod details.
import type { DbState, ID, Message } from "@/lib/types";

/** Message ids the signed-in user reported: render as "Hidden for you · Show" (BLUEPRINT OV-01). */
export function myReportedMessageIds(db: DbState): Set<ID> {
  const out = new Set<ID>();
  if (!db.me) return out;
  for (const r of Object.values(db.reports)) if (r.reporter_id === db.me && r.message_id) out.add(r.message_id);
  return out;
}

/** People the signed-in user blocked. */
export function myBlockedIds(db: DbState): ID[] {
  return db.me ? db.blocks.filter((b) => b.blocker_id === db.me).map((b) => b.blocked_id) : [];
}

export function isBlockedByMe(db: DbState, userId: ID): boolean {
  return !!db.me && db.blocks.some((b) => b.blocker_id === db.me && b.blocked_id === userId);
}

/** Hide messages from people I blocked (shared pods). */
export function visibleMessages(db: DbState, messages: Message[]): Message[] {
  const blocked = new Set(myBlockedIds(db));
  return messages.filter((m) => !m.user_id || !blocked.has(m.user_id));
}

/**
 * Edge case 25: an open unsafe/harassment report pauses the reported member's chat access in that pod.
 * Nothing about this names a reporter. Show the target "Your access to this chat is paused while we look into something."
 */
export function isChatPaused(db: DbState, podId: ID, userId: ID | null = db.me): boolean {
  if (!userId) return false;
  return Object.values(db.reports).some(
    (r) => r.status === "open" && r.pod_id === podId && r.reported_id === userId && (r.reason === "unsafe" || r.reason === "harassment"),
  );
}

export const REPORT_DAILY_LIMIT = 5;
