// [U11] Demo beats (ARCHITECTURE §11): the scripted lines the simulated members say, and the state changes that
// happen when the demo clock passes a hangout's end. Deterministic: every pick is hash32(key) % n, never Math.random.
// Bots are `is_demo_bot: true`; honesty lives in the single DemoBar (D15). Lines never claim facts about venues,
// prices or the weather: they are reactions, questions and logistics a friendly member would say.
import type { Draft } from "immer";
import { hash32, newId } from "@/lib/ids";
import type { DbState, ID, Pod } from "@/lib/types";

export function pick<T>(list: readonly T[], key: string): T {
  return list[hash32(key) % list.length];
}

/** Welcome lines, in order, one per bot. First is "hey", second is a topic question. */
const WELCOME_OPENERS = [
  "Hey, welcome in!",
  "Welcome! Glad you're here.",
  "Hey hey, welcome to the pod.",
  "Welcome! Good to have you.",
] as const;

const WELCOME_BY_KEY: Record<string, readonly string[]> = {
  basketball: ["Who's got the Sunday run? Anyone bringing a ball?", "Pickup is casual here. All levels."],
  guitar: ["What do you play? Acoustic, electric, a little of both?", "We usually trade songs more than we perform."],
  southern_african: ["Good to see another familiar accent in here.", "Say hi when you've settled in. No pressure."],
  sda: ["Welcome. Potlucks and walks are usually on the table.", "Happy to meet you. Take your time."],
};
const WELCOME_GENERIC = [
  "What brought you to Huntsville?",
  "Say hi whenever you're ready. We're all fairly new at this too.",
  "Anything you're hoping to try first?",
] as const;

export function welcomeLines(pod: Pod): string[] {
  const topical = WELCOME_BY_KEY[pod.topic_key] ?? WELCOME_BY_KEY[pod.topic.toLowerCase()];
  return [pick(WELCOME_OPENERS, `welcome:${pod.id}`), ...(topical ? topical.slice(0, 1) : [pick(WELCOME_GENERIC, `welcome2:${pod.id}`)])];
}

const REPLY_QUESTION = [
  "Good question. I'd say yes, and I can double check.",
  "I think so. Let's see what the others say.",
  "Honestly not sure. Anyone know?",
  "Same question here, actually.",
] as const;
const REPLY_STATEMENT = [
  "Love that.",
  "Same, that works for me.",
  "Nice, I'm in for that.",
  "Ha, yes. See you there.",
  "That sounds good to me.",
  "Count me in.",
] as const;

export function replyLine(text: string, key: string): string {
  return pick(/\?\s*$/.test(text.trim()) ? REPLY_QUESTION : REPLY_STATEMENT, key);
}

export const CHECKIN_PROMPT = "How did it go? Tap I went to check in, and tell Pods if you'd run it back.";

/** Push a message from a member or the host onto the draft. `key` makes it idempotent across tabs and reloads. */
export function pushMessage(
  d: Draft<DbState>,
  podId: ID,
  userId: ID | null,
  text: string,
  at: string,
  opts: { key: string; kind?: "text" | "host" | "checkin_prompt" | "system"; refId?: ID | null },
): boolean {
  const list = (d.messages[podId] ??= []);
  if (list.some((m) => m.client_id === opts.key)) return false;
  list.push({
    id: newId("msg"),
    pod_id: podId,
    user_id: userId,
    text,
    created_at: at,
    kind: opts.kind ?? (userId ? "text" : "host"),
    ref_id: opts.refId ?? null,
    client_id: opts.key,
    pinned: false,
    delivery: "sent",
  });
  return true;
}

/**
 * When the demo clock has passed a hangout's end: upcoming/in_progress → done, and the pod gets the check-in prompt
 * (once). Returns the hangout ids settled. Runs in the Director jump and in the crowd poll, so it works with the
 * crowd off.
 */
export function settleHangouts(d: Draft<DbState>, nowMs: number, nowIso: string): ID[] {
  const settled: ID[] = [];
  for (const h of Object.values(d.hangouts)) {
    if (h.status === "cancelled" || h.status === "done") continue;
    if (Date.parse(h.ends_at) > nowMs) continue;
    h.status = "done";
    settled.push(h.id);
    pushMessage(d, h.pod_id, null, CHECKIN_PROMPT, nowIso, { key: `crowd:prompt:${h.id}`, kind: "checkin_prompt", refId: h.id });
  }
  return settled;
}
