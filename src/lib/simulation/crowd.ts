// [U11] Simulated crowd (ARCHITECTURE §11): scripted `is_demo_bot` members that react to what the demo user does.
//   welcome replies with typing indicators 1.5-4 s apart · replies to your messages · RSVPs trickling in ·
//   votes · check-ins after the clock jump · run-it-back answers.
// Deterministic per pod (hash32 picks, no Math.random), capped (MAX_REPLIES per pod), idempotent (every bot message
// carries client_id "crowd:..." and is written only once, so reloads and a second tab never double up).
// Client-only. Started by DemoRuntime; switched off by config.demo.crowd (Director "Crowd").
"use client";

import { useSyncExternalStore } from "react";
import { useStore } from "@/lib/db/store";
import { nowISO, nowMs } from "@/lib/time/clock";
import { DEMO } from "@/config/demo";
import { hash32 } from "@/lib/ids";
import { applyVote } from "@/lib/db/local/hangouts";
import type { DbState, ID } from "@/lib/types";
import { pushMessage, replyLine, settleHangouts, welcomeLines } from "./script";

const MAX_REPLIES = 6;
const POLL_MS = 5000;

// ── Typing indicator store (U7's chat renders it via useTyping) ─────────
export interface TypingState {
  userId: ID;
  /** epoch ms (real time) after which the indicator is stale */
  until: number;
}
const typing = new Map<ID, TypingState>();
const typingSubs = new Set<() => void>();
const emitTyping = () => typingSubs.forEach((l) => l());

/** Who is "typing" in this pod right now (a simulated member), or null. */
export function useTyping(podId: ID | null | undefined): TypingState | null {
  return useSyncExternalStore(
    (cb) => {
      typingSubs.add(cb);
      return () => typingSubs.delete(cb);
    },
    () => (podId ? (typing.get(podId) ?? null) : null),
    () => null,
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────
const db = () => useStore.getState().db;

function botsIn(d: DbState, podId: ID): ID[] {
  return d.memberships
    .filter((m) => m.pod_id === podId && !m.left_at && m.activation !== "on_deck" && d.users[m.user_id]?.is_demo_bot)
    .map((m) => m.user_id)
    .sort((a, b) => hash32(`${podId}:${a}`) - hash32(`${podId}:${b}`));
}

function crowdOn(): boolean {
  const s = useStore.getState();
  return s.hydrated && s.db.config.demo.crowd;
}

function between(key: string, lo: number, hi: number): number {
  return lo + (hash32(key) % (hi - lo + 1));
}

/** Start the crowd. Returns a stop function. Safe to call once per tab. */
export function startCrowd(): () => void {
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const scheduled = new Set<string>(); // in-flight keys so one trigger never schedules twice
  let alive = true;
  let seenMessages: Set<ID> | null = null;
  let seeded: { sugs: Set<ID>; hangouts: Set<ID> } | null = null;
  let lastMe: ID | null | undefined;

  const later = (ms: number, fn: () => void) => {
    const t = setTimeout(() => {
      timers.delete(t);
      if (alive) fn();
    }, ms);
    timers.add(t);
  };

  /** Show typing for `typingMs`, then post. */
  const say = (podId: ID, botId: ID, text: string, key: string, delay: number, typingMs: number) => {
    later(delay, () => {
      if (!crowdOn()) return;
      typing.set(podId, { userId: botId, until: Date.now() + typingMs + 500 });
      emitTyping();
      later(typingMs, () => {
        typing.delete(podId);
        emitTyping();
        if (!crowdOn()) return;
        useStore.getState().commit((d) => {
          pushMessage(d, podId, botId, text, nowISO(), { key });
        });
      });
    });
  };

  const once = (key: string, fn: () => void) => {
    if (scheduled.has(key)) return;
    scheduled.add(key);
    fn();
  };

  const repliesIn = (d: DbState, podId: ID) => (d.messages[podId] ?? []).filter((m) => m.client_id?.startsWith("crowd:reply:")).length;

  function tick() {
    if (!crowdOn()) return;
    const d = db();
    const t = nowMs();
    const threshold = d.config.planner.lockThreshold;

    // Reset or a different person signed in: forget everything scheduled for the old state.
    if (lastMe !== undefined && lastMe !== d.me) {
      scheduled.clear();
      seenMessages = null;
    }
    lastMe = d.me;
    if (!seenMessages) {
      seenMessages = new Set(Object.values(d.messages).flat().map((m) => m.id));
      seeded = { sugs: new Set(Object.keys(d.suggestions)), hangouts: new Set(Object.keys(d.hangouts)) };
    }

    // 1. Welcome: each active pod I'm in that has no welcome yet.
    if (d.me) {
      for (const m of d.memberships) {
        if (m.user_id !== d.me || m.left_at || m.activation === "on_deck") continue;
        const pod = d.pods[m.pod_id];
        if (!pod) continue;
        if ((d.messages[pod.id] ?? []).some((x) => x.client_id?.startsWith("crowd:welcome:"))) continue;
        const bots = botsIn(d, pod.id);
        if (!bots.length) continue;
        once(`welcome:${pod.id}`, () => {
          const lines = welcomeLines(pod);
          let delay = between(`w0:${pod.id}`, 1500, 2200);
          lines.forEach((line, i) => {
            const typingMs = between(`wt:${pod.id}:${i}`, 1500, 2600);
            say(pod.id, bots[i % bots.length], line, `crowd:welcome:${pod.id}:${i}`, delay, typingMs);
            delay += typingMs + between(`wg:${pod.id}:${i}`, 1500, 4000);
          });
        });
      }

      // 2. Replies to my messages.
      for (const [podId, list] of Object.entries(d.messages)) {
        for (const msg of list) {
          if (seenMessages.has(msg.id)) continue;
          seenMessages.add(msg.id);
          if (msg.user_id !== d.me || msg.kind !== "text") continue;
          if (repliesIn(d, podId) >= MAX_REPLIES) continue;
          const bots = botsIn(d, podId);
          if (!bots.length) continue;
          const bot = bots[hash32(msg.id) % bots.length];
          say(podId, bot, replyLine(msg.text, msg.id), `crowd:reply:${msg.id}`, between(`rd:${msg.id}`, 900, 1800), between(`rt:${msg.id}`, 1500, 2800));
        }
      }
    }

    // 3. RSVPs trickle: new suggestions up to threshold-1 (my tap locks); freshly locked hangouts top up to 6.
    for (const s of Object.values(d.suggestions)) {
      if (s.status !== "suggested" || seeded?.sugs.has(s.id)) continue;
      const going = d.rsvps.filter((r) => r.hangout_id === s.id && r.status === "going");
      const need = threshold - 1 - going.length;
      if (need <= 0) continue;
      const candidates = botsIn(d, s.pod_id).filter((b) => !d.rsvps.some((r) => r.hangout_id === s.id && r.user_id === b));
      candidates.slice(0, need).forEach((bot, i) =>
        once(`rsvp:${s.id}:${bot}`, () =>
          later(between(`rv:${s.id}:${bot}`, 2500, 4500) * (i + 1), () =>
            useStore.getState().commit((x) => {
              const cur = x.suggestions[s.id];
              if (cur?.status !== "suggested" || x.rsvps.some((r) => r.hangout_id === s.id && r.user_id === bot)) return;
              x.rsvps.push({ hangout_id: s.id, user_id: bot, status: "going", checked_in: false, checked_in_at: null });
            }),
          ),
        ),
      );
    }
    for (const h of Object.values(d.hangouts)) {
      if (h.status !== "upcoming" || seeded?.hangouts.has(h.id)) continue;
      // Video script beat 6: the demo hangout reads exactly "4 of 8 in. Locked." after the user's tap, so no top-up there.
      if (h.suggestion_id === DEMO.hoopers.suggestionId) continue;
      const going = d.rsvps.filter((r) => r.hangout_id === h.id && r.status === "going").length;
      const candidates = botsIn(d, h.pod_id).filter((b) => !d.rsvps.some((r) => r.hangout_id === h.id && r.user_id === b));
      candidates.slice(0, Math.max(0, 6 - going)).forEach((bot, i) =>
        once(`top:${h.id}:${bot}`, () =>
          later(between(`tp:${h.id}:${bot}`, 3000, 5000) * (i + 1), () =>
            useStore.getState().commit((x) => {
              if (x.rsvps.some((r) => r.hangout_id === h.id && r.user_id === bot)) return;
              x.rsvps.push({ hangout_id: h.id, user_id: bot, status: "going", checked_in: false, checked_in_at: null });
            }),
          ),
        ),
      );
    }

    // 4. Votes: bots back the first (default) option until one short of the threshold.
    for (const v of Object.values(d.votes)) {
      if (v.status !== "open" || !v.option_ids.length) continue;
      const need = threshold - 1 - Object.keys(v.votes).length;
      if (need <= 0 || (d.me && v.votes[d.me])) continue;
      botsIn(d, v.pod_id)
        .filter((b) => !v.votes[b])
        .slice(0, need)
        .forEach((bot, i) =>
          once(`vote:${v.id}:${bot}`, () =>
            later(between(`vt:${v.id}:${bot}`, 1500, 3000) * (i + 1), () =>
              useStore.getState().commit((x) => {
                const cur = x.votes[v.id];
                // Through applyVote so the 4th vote (bot or human, in any order) closes the vote and locks round two.
                if (cur?.status === "open" && !cur.votes[bot]) applyVote(x, v.id, bot, cur.option_ids[0], nowISO());
              }),
            ),
          ),
        );
    }

    // 5. After the hangout ends (the Director jump moves the clock): settle, prompt, bots check in.
    if (Object.values(d.hangouts).some((h) => (h.status === "upcoming" || h.status === "in_progress") && Date.parse(h.ends_at) <= t)) {
      useStore.getState().commit((x) => {
        settleHangouts(x, t, nowISO());
      });
    }
    for (const h of Object.values(db().hangouts)) {
      if (h.status !== "done") continue;
      d.rsvps
        .filter((r) => r.hangout_id === h.id && r.status === "going" && !r.checked_in && d.users[r.user_id]?.is_demo_bot)
        .forEach((r, i) =>
          once(`checkin:${h.id}:${r.user_id}`, () =>
            later(between(`ci:${h.id}:${r.user_id}`, 900, 1600) * (i + 1), () =>
              useStore.getState().commit((x) => {
                const rs = x.rsvps.find((y) => y.hangout_id === h.id && y.user_id === r.user_id);
                if (rs && !rs.checked_in) {
                  rs.checked_in = true;
                  rs.checked_in_at = nowISO();
                }
              }),
            ),
          ),
        );

      // 6. Run-it-back: once I answer, the bots answer (all yes but one "not sure"), then it reveals at the minimum.
      const rib = d.runItBack[h.id];
      if (d.me && rib?.responses[d.me]) {
        const checked = d.rsvps.filter((r) => r.hangout_id === h.id && r.checked_in && r.user_id !== d.me && d.users[r.user_id]?.is_demo_bot);
        checked.forEach((r, i) => {
          if (rib.responses[r.user_id]) return;
          const last = i === checked.length - 1 && checked.length >= 3;
          once(`rib:${h.id}:${r.user_id}`, () =>
            later(between(`rb:${h.id}:${r.user_id}`, 1200, 2200) * (i + 1), () =>
              useStore.getState().commit((x) => {
                const cur = (x.runItBack[h.id] ??= { hangout_id: h.id, responses: {}, revealed_at: null });
                cur.responses[r.user_id] ??= last ? "not_sure" : "yes";
              }),
            ),
          );
        });
        const yes = Object.values(rib.responses).filter((a) => a === "yes").length;
        if (!rib.revealed_at && yes >= d.config.planner.runItBackRevealMin) {
          once(`reveal:${h.id}`, () =>
            later(1200, () =>
              useStore.getState().commit((x) => {
                const cur = x.runItBack[h.id];
                if (cur && !cur.revealed_at) cur.revealed_at = nowISO();
              }),
            ),
          );
        }
      }
    }
  }

  const unsub = useStore.subscribe(() => tick());
  const poll = setInterval(tick, POLL_MS);
  tick();

  return () => {
    alive = false;
    unsub();
    clearInterval(poll);
    timers.forEach(clearTimeout);
    timers.clear();
    typing.clear();
    emitTyping();
  };
}
