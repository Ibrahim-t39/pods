// [U2] Pods, memberships, hangouts, suggestions, RSVPs, run-it-back, votes, chat and cached Claude outputs.
// Two kinds of pod:
//  - the four DEMO pods (Hoopers, Strings, Southern African, Adventist): formed Wed Oct 28 / Nov 1, one pre-written starter plan,
//    short fresh chat, nothing has happened yet (Chanda joins them live);
//  - the other 14 pods: up to 6 weeks of SYNTHETIC history (done hangouts, check-ins, private run-it-back answers, votes)
//    so the admin metrics have something to chart. All of it is labelled "Synthetic demo data" in the admin UI.
// Deterministic: no Date.now, no Math.random. Same (users, anchor) -> same output.
import type {
  Hangout, HangoutSuggestion, ID, Membership, Message, NextHangoutVote, PlannerCacheEntry, PlannerStep, Pod, RSVP,
  RunItBack, RunItBackAnswer, Slot, User,
} from "@/lib/types";
import { DEMO } from "@/config/demo";
import { WEEKDAY_EVENINGS } from "@/lib/types";
import { ageOn } from "@/lib/utils";
import { hash32, seededRandom } from "@/lib/ids";
import { POD_DEFS, type PodDef } from "./pods";
import { botId } from "./users";
import { HOST, LINES, WHAT_WELCOME, aiBring, aiRain } from "./messages";
import { type PlanSlot, isWeekdayEvening, SLOT_PHRASE, SLOT_START, SLOT_WEEKDAY, TOPICS, VENUE_BY_ID, buildPlan, candidateVenues, rankSlots, suggestionFrom } from "./plans";
import { addDays, addMinutes, at, dateOf, nextWeekday } from "./time";

export interface PodWorld {
  pods: Pod[];
  memberships: Membership[];
  hangouts: Hangout[];
  suggestions: HangoutSuggestion[];
  rsvps: RSVP[];
  votes: NextHangoutVote[];
  runItBack: RunItBack[];
  messages: Record<ID, Message[]>;
  plannerCache: PlannerCacheEntry[];
  /** pod id -> member names, for the report script */
  rosterByPod: Record<ID, string[]>;
}

/** Which venue-fit key the planner counts for this pod (communities plan like any pod: public, cheap, daytime). */
const interestTopicOf = (def: PodDef) => (def.type === "interest" ? def.plan : def.plan === "sda" ? "hiking" : "any");

/** Can this pod meet in this slot at this venue? (Dark evenings outdoors, no evening trips to a cafe with a bar.) */
function slotOk(plan: string, venueId: string, slot: PlanSlot, afterDate: string): boolean {
  if (slot === "saturday-evening" || slot === "sunday-evening") return false;
  if (venueId === "venue_lucky_dice" && isWeekdayEvening(slot)) return false; // the cafe has a bar: daytime only
  if (!VENUE_BY_ID[venueId].indoor && isWeekdayEvening(slot) && afterDate >= "2026-10-20") return false; // dark by 6
  void plan;
  return true;
}

function pickSlot(def: PodDef, ranks: { slot: PlanSlot; free: number }[], afterDate: string): { slot: PlanSlot; free: number } {
  const ok = ranks.filter((r) => slotOk(def.plan, TOPICS[def.plan].venue, r.slot, afterDate));
  if (!ok.length) return ranks[0];
  // Among slots nearly as good as the best, vary by pod so the calendar is not one big Sunday 1 PM.
  const viable = ok.filter((r) => r.free >= ok[0].free - 1);
  return viable[hash32(def.id + ":slot") % viable.length];
}

export function buildPodWorld(users: Map<string, User>, anchor: string): PodWorld {
  const anchorDate = dateOf(anchor);
  const w: PodWorld = {
    pods: [], memberships: [], hangouts: [], suggestions: [], rsvps: [], votes: [], runItBack: [], messages: {}, plannerCache: [], rosterByPod: {},
  };
  const NOV1 = "2026-11-01";

  for (const def of POD_DEFS) {
    const rnd = seededRandom(`pod:${def.id}`);
    const members = def.members.map((n) => {
      const u = users.get(botId(n));
      if (!u) throw new Error(`Seed: pod ${def.id} lists unknown member ${n}`);
      return u;
    });
    w.rosterByPod[def.id] = def.members;
    const byJoin = [...members].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
    const sixth = byJoin[Math.min(5, byJoin.length - 1)];
    const formedDate = def.demo ? NOV1 : addDays(dateOf(sixth.created_at), 1);
    const formedAt = def.demo ? at(NOV1, "09:00") : at(formedDate, "09:00");

    const ages = members.map((u) => ageOn(u.date_of_birth, anchor));
    const pod: Pod = {
      id: def.id, name: def.name, photo_url: `/pods/${def.id}.svg`, type: def.type, community_kind: def.kind, topic: def.topic,
      topic_key: def.topic_key, city: "Seattle metro", age_min: Math.min(19, ...ages), age_max: Math.max(25, ...ages),
      widened_from: def.widened ?? null, status: "active", created_at: formedAt, hue: def.hue,
    };
    w.pods.push(pod);

    const mem = (u: User, i: number): Membership => ({
      pod_id: def.id, user_id: u.id, role: "member", muted: false, card_dismissed: false, card_dismissed_for: null, activation: "active",
      joined_at: u.created_at > formedAt ? addMinutes(u.created_at, 30) : addMinutes(formedAt, i),
      left_at: null,
    });
    const memberships = byJoin.map(mem);
    w.memberships.push(...memberships);

    // free-time counts: members + the live persona for demo pods (she joins during onboarding)
    const personaSlots: Slot[] = (def.persona ?? []).map((c) => (c === "W" ? WEEKDAY_EVENINGS : ["sunday-afternoon" as Slot])).flat();
    const avail = members.map((u) => u.availability);
    if (def.persona) avail.push(personaSlots);
    const totalMembers = members.length + (def.persona ? 1 : 0);
    const ranks = rankSlots(avail);
    const msgs: Message[] = [];
    let mi = 0;
    // Members do not text at 5 AM: move early/late messages to the evening before / earlier that night.
    const humanTime = (iso: string): string => {
      const h = Number(iso.slice(11, 13));
      if (h >= 8 && h < 22) return iso;
      const day = h < 8 ? addDays(iso.slice(0, 10), -1) : iso.slice(0, 10);
      return at(day, h < 8 ? "19:30" : "21:30");
    };
    const pushMsg = (user_id: string | null, text: string, atISO: string, kind: Message["kind"] = "text", extra: Partial<Message> = {}) => {
      if (user_id) atISO = humanTime(atISO);
      msgs.push({ id: `msg_${def.id.replace(/^pod_/, "")}_${String(++mi).padStart(3, "0")}`, pod_id: def.id, user_id, text, created_at: atISO, kind, ref_id: null, client_id: null, pinned: false, delivery: "sent", ...extra });
    };
    const lines = LINES[def.plan] ?? LINES.books;
    const pickLine = (pool: string[], key: string) => pool[hash32(`${def.id}:${key}`) % pool.length];
    const author = (key: string, exclude?: string) => {
      const pool = exclude ? members.filter((m) => m.id !== exclude) : members;
      return pool[hash32(`${def.id}:a:${key}`) % pool.length];
    };

    if (def.demo) {
      // ── one pre-written starter plan, fresh chat ──
      const top = ranks.slice(0, 2);
      const isHoopers = def.id === DEMO.hoopers.podId;
      const isSA = def.id === DEMO.southernAfrican.podId;
      const isStrings = def.id === "pod_rocket_city_strings";
      const slot = isStrings ? ("weekday-evening" as PlanSlot) : ranks[0].slot;
      const date = isHoopers ? dateOf(DEMO.hoopers.starts_at)
        : isSA ? dateOf(DEMO.southernAfrican.starts_at)
        : isStrings ? "2026-11-12" // Thu, 5:00 PM at Center Armory (indoors, open daily)
        : "2026-11-29"; // Adventist: Sunday trail walk
      const free = ranks.find((r) => r.slot === slot)!.free;
      const built = buildPlan({
        podId: def.id, podName: def.name, topicKey: def.plan, interestTopic: interestTopicOf(def), members: totalMembers, slot, free, topTwo: top, date,
        startHHMM: isStrings ? "17:00" : undefined,
        title: isHoopers ? DEMO.hoopers.title : isSA ? "Sunday picnic at Gas Works Park" : undefined,
        reasonOverride: isHoopers ? `Chosen because ${DEMO.hoopers.reason}.` : undefined,
        costText: isHoopers || isSA ? "Free" : undefined,
      });
      const onDeckPod = !isHoopers && !isSA; // Strings + Adventist: on deck for the persona, so no live plan yet (BLUEPRINT D4)
      const sugId = isHoopers ? DEMO.hoopers.suggestionId : isSA ? "sug_southern_african_1" : `sug_${def.id.replace(/^pod_/, "")}_1`;
      const going = isHoopers ? ["Malik", "Ama", "Tobi"] : isSA ? ["Tendai", "Lindiwe"] : [];
      if (onDeckPod) {
        // Pre-written first plan, held in the planner cache. U4 turns it into a suggestion when the pod opens
        // (after the member's first check-in anywhere), so placement still ranks Hoopers + Southern African first.
        w.plannerCache.push({ pod_id: def.id, job: "plan", source: "seed", created_at: addMinutes(formedAt, 5), output: { plan: built.plan, trace: built.trace, venue_id: built.venue.id, suggestion_id: sugId } });
      } else {
        const s = suggestionFrom(sugId, def.id, built, addMinutes(formedAt, 5), { round: 1 });
        w.suggestions.push(s);
        // Board counts per the script: Hoopers has 3 going before Chanda; Southern African has 2.
        for (const n of going) w.rsvps.push({ hangout_id: sugId, user_id: botId(n), status: "going", checked_in: false, checked_in_at: null });
      }

      if (onDeckPod) {
        pushMsg(null, `Welcome to ${def.name}. You're ${totalMembers} people ${WHAT_WELCOME[def.plan]}, all around Seattle. This pod opens after your first check-in anywhere, and Pods plans your first hangout then.`, addMinutes(formedAt, 6), "host");
      } else {
        pushMsg(null, HOST.welcome(def.name, totalMembers, WHAT_WELCOME[def.plan]), addMinutes(formedAt, 6), "host",
          isHoopers ? { quick_replies: ["👋 Hey all", "Just moved here", "Who's bringing a ball?"] } : { quick_replies: ["👋 Hey all", "Just moved here"] });
        pushMsg(null, built.plan.summary, addMinutes(formedAt, 7), "plan_card", { ref_id: sugId, pinned: true });
      }
      const a1 = author("d1"); const a2 = author("d2", a1.id); const a3 = author("d3", a2.id);
      if (isHoopers) {
        pushMsg(null, "Malik, Ama and Tobi are in for Saturday", at(NOV1, "12:40"), "system");
        pushMsg(botId("Malik"), "I'll grab the far court if we're early", at(NOV1, "12:42"), "text", { reactions: { fire: [botId("Tobi"), botId("Ama")] } });
        pushMsg(botId("Tobi"), "Same! Tacos after?", at(NOV1, "12:47"), "text", { reactions: { laugh: [botId("Malik")], thumbs: [botId("Ama"), botId("Kayla")] } });
        pushMsg(botId("Marcus"), "Saturday mornings are my thing. Let me check and I'll tap in", at("2026-11-02", "08:15"));
        // the AI in the chat: answers an @AI question from the plan itself, then stays quiet
        pushMsg(botId("Marcus"), "@AI what if it rains?", at("2026-11-02", "08:16"));
        pushMsg(null, aiRain(built.plan.rain_plan), at("2026-11-02", "08:16"), "host", { quick_replies: ["What to bring?", "Who's in?"] });
        pushMsg(botId("Ama"), "I'll bring a ball and a pump, mine's a little flat", at("2026-11-02", "19:30"));
        pushMsg(botId("Tobi"), "Thanks. I'll bring water for everyone", at("2026-11-02", "19:36"), "text", { reply_to: msgs[msgs.length - 1].id, reactions: { heart: [botId("Ama")] } });
        pushMsg(botId("Kayla"), "Cool, I'll be the one in the pink socks", at("2026-11-03", "20:05"), "text", { reactions: { laugh: [botId("Tobi"), botId("Malik")] } });
        pushMsg(null, "Quick update: 3 of 8 are in for Saturday at Miller Playfield. One more and it locks.", at("2026-11-03", "20:30"), "host", { quick_replies: ["What to bring?", "Who's in?"] });
      } else if (onDeckPod) {
        pushMsg(a1.id, pickLine(lines.misc, "m1"), at("2026-11-02", "11:25"));
        pushMsg(a2.id, pickLine(lines.misc, "m2"), at("2026-11-03", "18:40"));
      } else {
        pushMsg(a1.id, pickLine(lines.pre, "p1"), at("2026-11-01", "14:10"));
        pushMsg(a2.id, pickLine(lines.misc, "m1"), at("2026-11-02", "11:25"));
        if (isSA) {
          pushMsg(a2.id, "@AI what should we bring?", at("2026-11-02", "11:31"));
          pushMsg(null, aiBring(built.plan.bring), at("2026-11-02", "11:31"), "host", { quick_replies: ["Rain plan?", "Who's in?"] });
        }
        pushMsg(a3.id, pickLine(lines.pre, "p2"), at("2026-11-03", "18:40"));
      }
      w.messages[def.id] = msgs;
      continue;
    }

    // ─────────── Synthetic history (14 pods) ───────────
    const t = TOPICS[def.plan];
    const gap = 14;
    const bestA = pickSlot(def, ranks, anchorDate);
    const wd = SLOT_WEEKDAY[bestA.slot];
    let d = nextWeekday(addDays(formedDate, 5 + (hash32(def.id) % 3)), wd);
    const doneDates: string[] = [];
    while (d <= addDays(anchorDate, -2)) {
      doneDates.push(d);
      if (def.repeats === false) break;
      d = addDays(d, gap);
    }
    // next date: after the last done one, and at least 3 days after the anchor
    let upDate = addDays(doneDates[doneDates.length - 1], def.repeats === false ? 21 : gap);
    if (upDate < addDays(anchorDate, 3)) upDate = addDays(nextWeekday(addDays(anchorDate, 3), wd), 7 * (hash32(def.id + ":wk") % 3));
    if (def.repeats !== false && hash32(def.id + ":wk2") % 2 === 0) upDate = addDays(upDate, 7);
    const lockedUpcoming = def.repeats !== false && def.plan !== "climbing" && hash32(def.id + "lock") % 3 === 0;
    const climbingReview = def.plan === "climbing";

    const seqAll = [...doneDates, upDate];
    const sugIds: string[] = [];
    let prev: HangoutSuggestion | null = null;
    let prevHangout: Hangout | null = null;
    const recent = (iso: string) => iso;

    seqAll.forEach((date, idx) => {
      const seq = idx + 1;
      const isUp = idx === seqAll.length - 1;
      const slot = bestA.slot;
      const free = bestA.free;
      const altVenues = def.type === "interest" && def.plan !== "climbing"
        ? [t.venue, ...candidateVenues(def.plan).map((v) => v.id).filter((id) => id !== t.venue)].filter((id) => slotOk(def.plan, id, slot, anchorDate))
        : [t.venue];
      const rotated = altVenues[(seq - 1) % altVenues.length] ?? t.venue;
      const built = buildPlan({
        podId: def.id, podName: def.name, topicKey: climbingReview && isUp ? "climbing_gym" : def.plan, interestTopic: interestTopicOf(def), members: members.length, slot, free, topTwo: ranks.slice(0, 2),
        date, overBudget: climbingReview && isUp,
        venueId: climbingReview && isUp ? "venue_high_point_climbing" : rotated,
        title: climbingReview && isUp ? "Intro climb at Vertical World" : undefined,
        costText: climbingReview && isUp ? "Day pass, price to confirm" : undefined,
        reasonOverride: climbingReview && isUp ? `Chosen because ${free} of ${members.length} of you are free ${SLOT_PHRASE[slot]}. Day passes are over the usual $15, so a person checks it first.` : undefined,
      });
      const createdAt = seq === 1 ? addMinutes(formedAt, 5) : addMinutes(at(doneDates[seq - 2] ?? date, SLOT_START[slot]), 24 * 60 + 90);
      const sugId = `sug_${def.id.replace(/^pod_/, "")}_${seq}`;
      let trace: PlannerStep[] = built.trace;
      if (seq >= 2 && prev) {
        const prevAtt = w.rsvps.filter((r) => r.hangout_id === prevHangout!.id && r.checked_in).length;
        const rib = w.runItBack.find((r) => r.hangout_id === prevHangout!.id);
        const yes = rib ? Object.values(rib.responses).filter((x) => x === "yes").length : 0;
        trace = [...trace.slice(0, 4),
          { id: "context", label: "Reading how hangout #" + (seq - 1) + " went", detail: `${prevAtt} checked in · ${yes} said yes to running it back`, status: "done" },
          { id: "repeat", label: "Keeping it fresh", detail: prev.venue_id === built.venue.id ? `Same place as #${seq - 1}: the pod voted to run it back` : `Not repeating "${prev.summary}"`, status: "done" },
          ...trace.slice(4)];
      }
      if (climbingReview && isUp) {
        trace = trace.map((x) => (x.id === "venues" ? { ...x, detail: "1 climbing gym fits, but a day pass is over the usual $15", status: "warn" as const } : x));
      }
      const status: HangoutSuggestion["status"] = isUp ? (climbingReview ? "pending_review" : lockedUpcoming ? "accepted" : "suggested") : "accepted";
      const s = suggestionFrom(sugId, def.id, built, createdAt, { round: seq, status, trace });
      w.suggestions.push(s);
      sugIds.push(sugId);

      // an alternative option for rounds 2+ (voted down, or still being voted on)
      let alt: HangoutSuggestion | null = null;
      if (seq >= 2) {
        const second = ranks.find((r) => r.slot !== slot && slotOk(def.plan, built.venue.id, r.slot, anchorDate));
        const altSlot = second?.slot ?? slot;
        const altDate = second ? nextWeekday(addDays(date, 1), SLOT_WEEKDAY[altSlot]) : addDays(date, 7);
        const builtAlt = buildPlan({ podId: def.id, podName: def.name, topicKey: def.plan, interestTopic: interestTopicOf(def), members: members.length, slot: altSlot, free: second?.free ?? free, topTwo: ranks.slice(0, 2), date: altDate, venueId: built.venue.id });
        alt = suggestionFrom(`${sugId}_alt`, def.id, builtAlt, createdAt, { round: seq, option_index: 1, status: isUp && !lockedUpcoming && !climbingReview ? "suggested" : "replaced", trace });
        w.suggestions.push(alt);
      }

      // hangout + rsvps for done or locked
      const hangoutId = `hang_${def.id.replace(/^pod_/, "")}_${seq}`;
      const locked = !isUp || lockedUpcoming;
      const order = [...members].sort((a, b) => hash32(`${def.id}:${seq}:${a.id}`) - hash32(`${def.id}:${seq}:${b.id}`));
      if (locked) {
        const hg: Hangout = {
          id: hangoutId, pod_id: def.id, title: built.plan.summary, starts_at: built.startsAt, ends_at: built.endsAt, venue_id: built.venue.id,
          plan_text: built.plan.event, is_starter: seq === 1, suggestion_id: sugId, status: isUp ? "upcoming" : "done", sequence: seq,
        };
        w.hangouts.push(hg);
        const k = isUp ? Math.min(order.length, 5) : Math.min(order.length, 4 + (hash32(`${def.id}:${seq}:k`) % 3));
        order.slice(0, k).forEach((u, j) => {
          const attended = !isUp && j < Math.max(4, Math.round(k * 0.8));
          w.rsvps.push({ hangout_id: hangoutId, user_id: u.id, status: "going", checked_in: attended, checked_in_at: attended ? addMinutes(built.endsAt, 8 + j * 3) : null });
        });
        if (!isUp && order.length > k) w.rsvps.push({ hangout_id: hangoutId, user_id: order[k].id, status: "not_going", checked_in: false, checked_in_at: null });
        if (!isUp) {
          const att = w.rsvps.filter((r) => r.hangout_id === hangoutId && r.checked_in).map((r) => r.user_id);
          if (seq === 1) att.slice(0, 2).forEach((uid) => { const m = memberships.find((x) => x.user_id === uid); if (m) m.role = "admin"; });
          // private run-it-back: stalled pods have fewer than 4 yeses, so no number is ever shown
          const stalled = def.repeats === false;
          const responses: Record<string, RunItBackAnswer> = {};
          att.forEach((uid, j) => {
            const r = (hash32(`${hangoutId}:${uid}`) % 100) / 100;
            responses[uid] = stalled ? (j < 3 ? "yes" : j === 3 ? "not_sure" : "no") : j < 4 ? "yes" : r < 0.82 ? "yes" : r < 0.94 ? "not_sure" : "no";
          });
          const yes = Object.values(responses).filter((x) => x === "yes").length;
          w.runItBack.push({ hangout_id: hangoutId, responses, revealed_at: yes >= 4 ? addMinutes(built.endsAt, 45) : null });
        }
      } else {
        // unlocked upcoming: 2 or 3 going
        const k = 2 + (hash32(`${def.id}:k`) % 2);
        order.slice(0, k).forEach((u) => w.rsvps.push({ hangout_id: sugId, user_id: u.id, status: "going", checked_in: false, checked_in_at: null }));
      }

      // vote for rounds 2+
      if (seq >= 2 && alt && prevHangout) {
        const open = isUp && !lockedUpcoming && !climbingReview;
        const votes: Record<string, string> = {};
        const nVotes = open ? 2 : Math.min(order.length, 5);
        order.slice(0, nVotes).forEach((u, j) => { votes[u.id] = open ? (j === 0 ? sugId : alt!.id) : (j < nVotes - 1 ? sugId : alt!.id); });
        w.votes.push({
          id: `vote_${def.id.replace(/^pod_/, "")}_${seq}`, pod_id: def.id, after_hangout_id: prevHangout.id, option_ids: [sugId, alt.id], votes,
          closes_at: open ? addMinutes(anchor, 20 * 60) : addMinutes(createdAt, 24 * 60), status: open ? "open" : "closed", winner_id: open ? null : sugId,
        });
      }

      // ───── chat for this cycle ─────
      const startISO = built.startsAt;
      if (seq === 1) {
        pushMsg(null, HOST.welcome(def.name, members.length, WHAT_WELCOME[def.plan]), addMinutes(formedAt, 6), "host");
      }
      pushMsg(null, built.plan.summary, addMinutes(createdAt, 2), "plan_card", { ref_id: sugId });
      if (seq >= 2) pushMsg(null, HOST.voteOpen, addMinutes(createdAt, 3), "vote", { ref_id: `vote_${def.id.replace(/^pod_/, "")}_${seq}` });
      const a1 = author(`s${seq}a`); const a2 = author(`s${seq}b`, a1.id);
      const preAt = (hoursBefore: number) => addMinutes(startISO, -hoursBefore * 60);
      if (locked) pushMsg(null, HOST.locked(isUp ? 5 : 4 + (hash32(`${def.id}:${seq}:k`) % 3)), addMinutes(createdAt, 40 + (hash32(`${def.id}:l`) % 90)), "system");
      pushMsg(a1.id, pickLine(lines.pre, `pre${seq}a`), preAt(isUp ? 20 : 30));
      if (!isUp || !locked) pushMsg(a2.id, pickLine(lines.pre, `pre${seq}b`), preAt(isUp ? 10 : 8));
      if (!isUp) {
        pushMsg(author(`s${seq}c`).id, pickLine(lines.post, `post${seq}a`), addMinutes(built.endsAt, 25));
        pushMsg(null, HOST.checkin, addMinutes(built.endsAt, 15), "checkin_prompt", { ref_id: hangoutId });
        pushMsg(author(`s${seq}d`).id, pickLine(lines.post, `post${seq}b`), addMinutes(built.endsAt, 70));
        pushMsg(null, HOST.runItBack, addMinutes(built.endsAt, 20), "run_it_back", { ref_id: hangoutId });
        const rib = w.runItBack[w.runItBack.length - 1];
        if (rib.revealed_at) {
          const answered = Object.keys(rib.responses).length;
          const yes = Object.values(rib.responses).filter((x) => x === "yes").length;
          pushMsg(null, HOST.runItBackReveal(yes, answered), rib.revealed_at, "run_it_back", { ref_id: hangoutId });
        } else {
          pushMsg(null, HOST.runItBackNo, addMinutes(built.endsAt, 60), "host");
        }
        if (hash32(`${def.id}:${seq}:misc`) % 2 === 0) pushMsg(author(`s${seq}e`).id, pickLine(lines.misc, `misc${seq}`), addMinutes(built.endsAt, 60 * 30));
      }
      prev = s; prevHangout = locked ? w.hangouts[w.hangouts.length - 1] : prevHangout;
    });

    // stalled pods: the host nudges once the pod has been quiet a while
    if (def.repeats === false) pushMsg(null, HOST.quiet, addMinutes(at(upDate, "09:00"), -9 * 24 * 60), "host");
    // nothing in the seed happens after the anchor
    for (let i = msgs.length - 1; i >= 0; i--) if (Date.parse(msgs[i].created_at) > Date.parse(anchor)) msgs.splice(i, 1);
    msgs.sort((a, b) => a.created_at.localeCompare(b.created_at));
    // re-number ids in chronological order so they sort naturally
    msgs.forEach((m, i) => { m.id = `msg_${def.id.replace(/^pod_/, "")}_${String(i + 1).padStart(3, "0")}`; });
    // fix refs to vote ids and keep pinned on the newest plan card
    const lastCard = [...msgs].reverse().find((m) => m.kind === "plan_card");
    if (lastCard) lastCard.pinned = true;
    w.messages[def.id] = msgs;
    void recent; void rnd; void sugIds; void candidateVenues; void t;
  }

  // ── cached Claude outputs for the four visible jobs (BLUEPRINT §6.6): why_fits, next_options, widen_explainer ──
  const cache = (pod_id: ID, job: PlannerCacheEntry["job"], output: unknown) =>
    w.plannerCache.push({ pod_id, job, source: "seed", output, created_at: at("2026-11-01", "09:10") });
  cache(DEMO.hoopers.podId, "why_fits", { line: "Eight people who play pickup near Seattle, most free Sunday afternoons" });
  cache("pod_rocket_city_strings", "why_fits", { line: "Six people who play guitar, free after work on weekdays" });
  cache(DEMO.southernAfrican.podId, "why_fits", { line: "Seven people with roots across Southern Africa, most free Sunday afternoons" });
  cache("pod_adventist_young_adults", "why_fits", { line: "Eight people from your community, nearly all free Sunday afternoons" });
  cache(DEMO.southernAfrican.podId, "widen_explainer", {
    body: "Only 3 Zambians live nearby, so we widened to Southern African. That gave you a group of 7.",
  });
  cache("pod_adventist_young_adults", "widen_explainer", { body: "No widening needed: your community already has a group of 8 in Seattle." });
  // Job 3: option 3 for Hoopers' hangout #2 (options 1-2 are rule-based, see DEMO.hangout2Options).
  const o3 = buildPlan({
    podId: DEMO.hoopers.podId, podName: "Hoopers", topicKey: "basketball", interestTopic: "basketball", members: 8, slot: "saturday-morning", free: 7,
    topTwo: [{ slot: "saturday-morning", free: 7 }], date: "2026-11-28", title: "Saturday run, then coffee downtown", costText: "Free",
    reasonOverride: "Chosen because the chat kept coming back to food after.",
  });
  o3.plan.schedule = [
    { time: "10:00 AM", item: "Meet at the courts" }, { time: "10:15 AM", item: "Shootaround, pick teams" }, { time: "10:30 AM", item: "Games, winners stay on" },
    { time: "11:45 AM", item: "Cool down" }, { time: "12:15 PM", item: "Optional coffee downtown at Victrola Coffee" },
  ];
  cache(DEMO.hoopers.podId, "next_options", { options: [o3.plan], reasons: ["Keeps what worked and adds the food-after people asked for."] });
  return w;
}
