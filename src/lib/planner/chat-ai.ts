// The AI as a member of the pod chat. Someone writes "@AI …" (or taps one of its chips) and it answers in one or two
// plain sentences, grounded only in this pod's data: the open plan, its venue, the rain plan, what to bring, who's in.
// Rule-based here (Demo and Live, no network); /api/chat-ai may rephrase the same facts with Claude when a key is set.
import { cardView } from "./card-state";
import { firstName } from "@/components/pods/model";
import type { DbState, ID } from "@/lib/types";
import { aiRain } from "@/data/messages";

export const AI_MENTION = /(^|\s)@ai\b[:,]?\s*/i;

/** Chips the AI offers under its replies. Tapping one sends "@AI <chip>" as you. */
export const AI_CHIPS = { rain: "Rain plan?", bring: "What to bring?", who: "Who's in?", cheaper: "Somewhere cheaper?", other: "Another option" } as const;

export type AiIntent = "rain" | "bring" | "who" | "cheaper" | "when" | "other" | "help";
export type AiReply = { text: string; chips: string[]; intent: AiIntent; facts: string[] };

export function asksAi(text: string): boolean {
  return AI_MENTION.test(text);
}

export function intentOf(q: string): AiIntent {
  const s = q.toLowerCase();
  if (/rain|weather|wet|storm|indoor/.test(s)) return "rain";
  if (/bring|pack|wear|need/.test(s)) return "bring";
  if (/who|going|how many|count|coming/.test(s)) return "who";
  if (/cheap|cost|price|free|money|\$|afford/.test(s)) return "cheaper";
  if (/when|time|where|address|start/.test(s)) return "when";
  if (/another|other option|different|instead|else|next/.test(s)) return "other";
  return "help";
}

const timeOf = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { weekday: "long", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" }).replace(":00", "");
};

const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** One grounded answer. Never invents a place: only venues already in the db are named. */
export function aiReply(db: DbState, podId: ID, question: string, nowMs: number): AiReply {
  const intent = intentOf(question.replace(AI_MENTION, " "));
  const view = cardView(db, podId, nowMs);
  const s = view?.suggestion ?? null;
  const p = s?.plan_json;
  const venue = view?.venue ?? (s ? db.venues[s.venue_id] : undefined);
  const where = venue ? (venue.short_name ?? venue.name) : "the spot";
  const facts: string[] = [];
  if (s && p) facts.push(`Plan: ${p.event} at ${where}, ${timeOf(s.starts_at)}. Cost: ${p.cost}. ${view?.going.length ?? 0} of ${view?.size ?? 0} are in.`);

  if (!s || !p) {
    return { intent, facts, chips: [AI_CHIPS.other], text: "There's no plan on the table yet. Want me to suggest one that fits when most of you are free?" };
  }

  switch (intent) {
    case "rain": {
      const alt = p.rain_venue_id ? db.venues[p.rain_venue_id] : undefined;
      facts.push(`Rain plan: ${p.rain_plan}`);
      const text = venue?.indoor
        ? `It's indoors at ${where}, so rain won't change anything.`
        : aiRain(p.rain_plan, alt ? (alt.short_name ?? alt.name) : undefined);
      return { intent, facts, text, chips: [AI_CHIPS.bring, AI_CHIPS.who] };
    }
    case "bring": {
      facts.push(`Bring: ${p.bring.join(", ")}`);
      return { intent, facts, text: p.bring.length ? `Bring ${list(p.bring.map(lower))}. That's it.` : "Nothing special. Just come as you are.", chips: [AI_CHIPS.rain, AI_CHIPS.who] };
    }
    case "who": {
      const going = view!.going.map((id) => (id === db.me ? "you" : firstName(db, id)));
      const need = Math.max(0, view!.threshold - going.length);
      const text = going.length
        ? `${going.length} of ${view!.size} are in: ${list(going)}.${view!.locked ? " It's locked." : need ? ` ${need} more and it's locked.` : ""}`
        : `Nobody's in yet. It locks when ${view!.threshold} people are in.`;
      return { intent, facts, text, chips: view!.imIn ? [AI_CHIPS.bring] : [AI_CHIPS.rain, AI_CHIPS.bring] };
    }
    case "cheaper": {
      const cost = venue?.cost_per_person ?? 0;
      if (cost === 0) return { intent, facts, text: `It's already free at ${where}. The only cost is getting there.`, chips: [AI_CHIPS.rain, AI_CHIPS.bring] };
      const cheaper = Object.values(db.venues)
        .filter((v) => v.city === venue?.city && v.is_public && !v.alcohol_centered && v.cost_per_person < cost && v.id !== venue?.id)
        .sort((a, b) => a.cost_per_person - b.cost_per_person)[0];
      if (!cheaper) return { intent, facts, text: `${p.cost} is the lowest I found nearby for this. I can look at a different day instead.`, chips: [AI_CHIPS.other] };
      facts.push(`Cheaper venue: ${cheaper.name}, $${cheaper.cost_per_person}`);
      return {
        intent, facts, chips: [AI_CHIPS.other],
        text: `${cheaper.short_name ?? cheaper.name} would be ${cheaper.cost_per_person === 0 ? "free" : `$${cheaper.cost_per_person} each`} instead of ${p.cost.toLowerCase()}. Want me to add it as an option?`,
      };
    }
    case "when":
      return { intent, facts, text: `${timeOf(s.starts_at)} at ${where}${venue?.address ? `, ${venue.address.split(",")[0]}` : ""}. ${p.cost}.`, chips: [AI_CHIPS.rain, AI_CHIPS.bring] };
    case "other":
      return { intent, facts, text: "On it. I'll add one more option to the plan and keep the same day if I can.", chips: [] };
    default:
      return { intent, facts, text: `I can help with the plan for ${timeOf(s.starts_at)}: the rain plan, what to bring, who's in, or somewhere cheaper.`, chips: [AI_CHIPS.rain, AI_CHIPS.bring, AI_CHIPS.who] };
  }
}
