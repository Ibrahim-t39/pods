// [U2] Safety + admin history + waitlist + verification rows. All SYNTHETIC (the admin pages say so).
// Report details are written in a calm, non-graphic tone and reference messages that exist in the seeded chats.
import type { AdminAction, Block, ID, Message, Report, User, Verification, WaitlistEntry } from "@/lib/types";
import { botId } from "./users";
import { addMinutes, at } from "./time";

export interface Extras {
  reports: Report[];
  adminActions: AdminAction[];
  blocks: Block[];
  waitlist: WaitlistEntry[];
  verifications: Verification[];
  /** extra messages to splice into pod chats (the ones the reports point at) */
  flagged: { pod_id: ID; message: Message }[];
}

export function buildExtras(users: User[]): Extras {
  const flagged: Extras["flagged"] = [];
  const flag = (pod_id: ID, id: ID, user: string, text: string, when: string): ID => {
    flagged.push({ pod_id, message: { id, pod_id, user_id: botId(user), text, created_at: when, kind: "text", ref_id: null, client_id: null, pinned: false, delivery: "sent" } });
    return id;
  };

  const m1 = flag("pod_soccer", "msg_soccer_flag_1", "Luis", "You could skip the group next time and just come hang with me", at("2026-11-01", "20:12"));
  const m2 = flag("pod_hiking", "msg_hiking_flag_1", "Owen", "Check my profile for a discount code on trail gear, message me for it", at("2026-10-31", "16:40"));
  const m3 = flag("pod_pickleball", "msg_pickleball_flag_1", "Wesley", "I'm on my way, ignore the old profile photo, long story", at("2026-10-25", "11:05"));

  const reports: Report[] = [
    { id: "report_001", reporter_id: botId("Trinity"), reported_id: botId("Luis"), pod_id: "pod_soccer", reason: "harassment",
      details: "Keeps suggesting we meet up without the group.", message_id: m1, status: "open", urgent: true,
      due_by: at("2026-11-03", "20:05"), created_at: at("2026-11-03", "19:05") },
    { id: "report_002", reporter_id: botId("Camila"), reported_id: botId("Owen"), pod_id: "pod_hiking", reason: "spam",
      details: null, message_id: m2, status: "open", urgent: false, due_by: at("2026-11-04", "16:45"), created_at: at("2026-11-03", "16:45") },
    { id: "report_003", reporter_id: botId("Hannah"), reported_id: botId("Wesley"), pod_id: "pod_pickleball", reason: "fake_profile",
      details: "Profile photo does not look like the person who showed up.", message_id: m3, status: "actioned", urgent: false,
      due_by: at("2026-10-26", "11:00"), created_at: at("2026-10-25", "11:00") },
    { id: "report_004", reporter_id: botId("Isaiah"), reported_id: botId("Camila"), pod_id: "pod_hiking", reason: "other",
      details: "Left partway through the hike without saying anything.", message_id: null, status: "dismissed", urgent: false,
      due_by: at("2026-10-19", "10:00"), created_at: at("2026-10-18", "10:00") },
  ];

  const adminActions: AdminAction[] = [
    { id: "aa_001", admin: "ops", target_user_id: null, report_id: null, action: "venue_edit",
      note: "Miller Playfield outdoor courts set inactive until a phone check confirms them. Indoor Rec Center stays the default.", created_at: at("2026-10-27", "14:00") },
    { id: "aa_002", admin: "ops", target_user_id: botId("Wesley"), report_id: "report_003", action: "warn", note: "Asked to update the profile photo before the next hangout.", created_at: at("2026-10-25", "15:30") },
    { id: "aa_003", admin: "ops", target_user_id: botId("Camila"), report_id: "report_004", action: "dismiss", note: "Left early for a personal reason, no safety concern.", created_at: at("2026-10-18", "17:10") },
    { id: "aa_004", admin: "ops", target_user_id: null, report_id: null, action: "hangout_edit", note: "Hiking plan moved off a full trailhead lot to the earlier slot.", created_at: at("2026-10-14", "09:30") },
    { id: "aa_005", admin: "ops", target_user_id: null, report_id: null, action: "config_change", note: "Pilot budget cap confirmed at $15 per person.", created_at: at("2026-09-22", "10:00") },
  ];

  const blocks: Block[] = [{ blocker_id: botId("Trinity"), blocked_id: botId("Luis"), created_at: at("2026-11-03", "19:10") }];

  const waitlist: WaitlistEntry[] = [
    { user_id: botId("Mei"), pod_kind: "community", topic_key: "east_asian", reason: "under_min", created_at: at("2026-10-12", "12:00") },
    { user_id: botId("Rohan"), pod_kind: "community", topic_key: "south_asian", reason: "under_min", created_at: at("2026-10-12", "12:00") },
    { user_id: botId("Nadia"), pod_kind: "community", topic_key: "north_african", reason: "under_min", created_at: at("2026-10-14", "12:00") },
  ];

  const verifications: Verification[] = users.map((u) => ({
    user_id: u.id, vendor: "simulated", status: "approved", reason: null,
    created_at: addMinutes(u.created_at, 5), decided_at: u.verified_at,
  }));

  return { reports, adminActions, blocks, waitlist, verifications, flagged };
}
