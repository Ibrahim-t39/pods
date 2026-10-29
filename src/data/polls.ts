// Seeded member polls in the demo pods (Platform §F2). Each one is a chat line (kind "poll") plus the Poll row, so the
// chat and the Inbox both show it and Chanda can vote from either. Votes are other members'; hers is left open.
import type { ID, Message, Poll } from "@/lib/types";
import { botId } from "./users";
import { at } from "./time";

export function buildSeedPolls(): { polls: Poll[]; flagged: { pod_id: ID; message: Message }[] } {
  const defs = [
    {
      id: "poll_hoopers_tacos", pod: "pod_hoopers", by: "Tobi", when: at("2026-11-03", "20:20"),
      q: "Tacos after Saturday's game?",
      opts: [["opt_tacos_yes", "I'm in"], ["opt_tacos_maybe", "Depends on the time"], ["opt_tacos_no", "Can't stay"]],
      votes: { Tobi: "opt_tacos_yes", Ama: "opt_tacos_yes", Kayla: "opt_tacos_maybe" },
    },
    {
      id: "poll_sa_food", pod: "pod_southern_african", by: "Kondwani", when: at("2026-11-03", "18:52"),
      q: "Picnic food: how should we do it?",
      opts: [["opt_food_dish", "Everyone brings a dish"], ["opt_food_grill", "Grill at the park"], ["opt_food_order", "Order in together"]],
      votes: { Kondwani: "opt_food_dish", Mpho: "opt_food_dish", Bupe: "opt_food_grill" },
    },
  ];
  const polls: Poll[] = [];
  const flagged: { pod_id: ID; message: Message }[] = [];
  for (const d of defs) {
    const message_id = `msg_${d.id}`;
    polls.push({
      id: d.id, pod_id: d.pod, created_by: botId(d.by), question: d.q,
      options: d.opts.map(([id, label]) => ({ id, label })),
      votes: Object.fromEntries(Object.entries(d.votes).map(([n, o]) => [botId(n), o])),
      created_at: d.when, closes_at: null, status: "open", message_id,
    });
    flagged.push({ pod_id: d.pod, message: { id: message_id, pod_id: d.pod, user_id: botId(d.by), text: d.q, created_at: d.when, kind: "poll", ref_id: d.id, client_id: null, pinned: false, delivery: "sent" } });
  }
  return { polls, flagged };
}
