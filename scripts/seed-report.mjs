// [U2] Prints the seed: pods table, venue sources, the Chanda scenario numbers, size. Exits 1 on any broken rule or > 2 MB.
// Usage: node scripts/seed-report.mjs [--roster /path/roster.json] [--json]
// Loads src/data/seed.ts through Vite SSR (same alias as vitest), so it runs the real code.
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const rosterOut = args.includes("--roster") ? args[args.indexOf("--roster") + 1] : null;

const server = await createServer({
  root, configFile: false, logLevel: "silent", appType: "custom",
  resolve: { alias: { "@": path.join(root, "src") } },
  server: { middlewareMode: true, hmr: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
});
let failed = 0;
const fail = (m) => { failed++; console.log("  FAIL  " + m); };
const ok = (m) => console.log("  ok    " + m);
const check = (cond, m) => (cond ? ok(m) : fail(m));

try {
  const { buildSeed, SEED_VERSION } = await server.ssrLoadModule("/src/data/seed.ts");
  const { DEMO } = await server.ssrLoadModule("/src/config/demo.ts");
  const { ageOn } = await server.ssrLoadModule("/src/lib/utils.ts");
  const db = buildSeed(DEMO.anchor);
  const again = buildSeed(DEMO.anchor);
  const json = JSON.stringify(db);
  const bytes = Buffer.byteLength(json);

  console.log(`\nPods seed ${SEED_VERSION}  anchor ${DEMO.anchor}`);
  console.log(`size ${(bytes / 1024).toFixed(1)} KB (limit 2048 KB)`);
  const pods = Object.values(db.pods);
  const mem = (pid) => db.memberships.filter((m) => m.pod_id === pid && !m.left_at);
  const sugOf = (pid) => Object.values(db.suggestions).filter((s) => s.pod_id === pid);
  const hangOf = (pid) => Object.values(db.hangouts).filter((h) => h.pod_id === pid);
  console.log(`\nusers ${Object.keys(db.users).length}  pods ${pods.length}  memberships ${db.memberships.length}  suggestions ${Object.keys(db.suggestions).length}  hangouts ${Object.keys(db.hangouts).length}  rsvps ${db.rsvps.length}  messages ${Object.values(db.messages).reduce((n, l) => n + l.length, 0)}  venues ${Object.keys(db.venues).length} (active ${Object.values(db.venues).filter((v) => v.active).length})\n`);

  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad("pod", 32) + pad("type", 11) + pad("members", 8) + pad("ages", 7) + pad("done", 5) + pad("next", 24) + "widened");
  for (const p of pods) {
    const next = sugOf(p.id).filter((s) => s.status !== "replaced").sort((a, b) => b.round - a.round)[0];
    console.log(pad(p.name, 32) + pad(p.type, 11) + pad(mem(p.id).length, 8) + pad(`${p.age_min}-${p.age_max}`, 7) + pad(hangOf(p.id).filter((h) => h.status === "done").length, 5) + pad(next ? `${next.starts_at.slice(5, 16)} ${next.status}` : "-", 24) + (p.widened_from ? `${p.widened_from.from} -> ${p.widened_from.to}` : ""));
  }

  console.log("\nvenues");
  for (const v of Object.values(db.venues)) console.log(`  ${v.active ? "active  " : "INACTIVE"} ${pad(v.short_name ?? v.name, 30)} ${v.source_url}`);

  console.log("\nchecks");
  check(bytes < 2 * 1024 * 1024, "seed < 2 MB");
  check(json === JSON.stringify(again), "deterministic: two builds are identical");
  check(Object.keys(db.interests).length >= 14, `${Object.keys(db.interests).length} interests (D9's 14 at launch, plus later additions)`);
  check(!Object.values(db.venues).some((v) => v.active && (!v.source_url || !v.verified_at)), "every active venue has source_url + verified_at");
  check(Object.values(db.users).every((u) => u.is_demo_bot && u.verified && (u.photo_urls[0] ?? "").startsWith("/avatars/")), "all users are demo bots with an avatar path");
  check(Object.keys(db.users).length >= 68 && Object.keys(db.users).length <= 74, "about 70 bots");
  const hp = DEMO.hoopers.podId, sa = DEMO.southernAfrican.podId;
  const hoopers = mem(hp).map((m) => db.users[m.user_id]);
  check(hoopers.length === 7, "Hoopers has 7 bots (Chanda makes 8)");
  // The plan's line "7 of 8 of you are free Saturday mornings": the 7 Hoopers who were there before Chanda.
  const satFree = hoopers.filter((u) => u.availability.includes("saturday-morning")).length;
  check(satFree === 7 && DEMO.hoopers.reason.startsWith("7 of 8"), `7 Hoopers free Saturday mornings, the plan's "7 of 8" (got ${satFree})`);
  const hs = db.suggestions[DEMO.hoopers.suggestionId];
  check(hs && hs.starts_at === DEMO.hoopers.starts_at && hs.starts_at.startsWith("2026-11-07T10:00") && hs.venue_id === "venue_brahan_spring_park", "Hoopers plan: Saturday Nov 7, 10am at Brahan Spring Park (free)");
  check(hs?.plan_json.rain_venue_id === "venue_brahan_rec", "Hoopers rain plan: Brahan Spring Rec Center");
  check(hs?.summary === DEMO.hoopers.title, `Hoopers title matches the video script ("${DEMO.hoopers.title}")`);
  check(hs.plan_json.reason.includes(DEMO.hoopers.reason), "Hoopers reason line matches BLUEPRINT §0");
  const going = db.rsvps.filter((r) => r.hangout_id === hs.id && r.status === "going").length;
  const lockAt = hs.min_to_lock ?? db.config.planner.lockThreshold;
  check(going === 3 && lockAt === 4 && going + 1 >= lockAt, `3 going before Chanda -> 4 locks (plan locks at ${lockAt})`);
  const ss = Object.values(db.suggestions).find((s) => s.pod_id === sa);
  check(ss && ss.starts_at === DEMO.southernAfrican.starts_at && ss.venue_id === "venue_big_spring_park", "Southern African: Sun Nov 15 1:00 PM at Big Spring Park");
  check(!Object.values(db.suggestions).some((x) => ["pod_rocket_city_strings", "pod_adventist_young_adults"].includes(x.pod_id)), "Strings + Adventist are on deck: plan held in plannerCache, no live suggestion");
  check(db.pods[sa].widened_from?.to === "Southern African", "Southern African pod is a widened group pod");
  const zam = Object.values(db.identities).filter((i) => i.heritage?.code === "ZM").length;
  check(zam === 2, `2 Zambian bots + Chanda = 3 in the metro (got ${zam} bots)`);
  const saMembers = mem(sa).length;
  check(saMembers >= 5 && saMembers <= 9, `Southern African pod has ${saMembers} bots (+ Chanda)`);
  check(mem("pod_adventist_young_adults").length >= 6, "Adventist pod forms without widening (>= 6 bots)");
  check(Object.values(db.pods).filter((p) => p.type === "interest").length === 14, "14 interest pods, one per launch interest");
  check(Object.values(db.pods).filter((p) => p.type === "community").length === 4, "4 community pods");
  // per-member caps + age bands
  const perUser = {};
  for (const m of db.memberships) if (!m.left_at) (perUser[m.user_id] ??= []).push(m.pod_id);
  check(Object.values(db.users).every((u) => (perUser[u.id] ?? []).length >= 1), "every bot is in at least one pod");
  check(Object.entries(perUser).every(([, ps]) => ps.filter((p) => db.pods[p].type === "interest").length <= 5 && ps.filter((p) => db.pods[p].type === "community").length <= 2), "interest pods <= 5, community pods <= 2 per bot");
  check(db.memberships.every((m) => { const p = db.pods[m.pod_id]; const a = ageOn(db.users[m.user_id].date_of_birth, DEMO.anchor); return a >= p.age_min && a <= p.age_max; }), "every member is inside the pod's age band");
  check(pods.every((p) => mem(p.id).length >= 5 && mem(p.id).length <= db.config.placement.podMax - 1), "pods have 5-9 members (room for Chanda)");
  check(pods.filter((p) => p.age_min <= 22 && p.age_max >= 22).length === pods.length, "Chanda (22) fits every pod's age band");
  // privacy rules
  const leak = /\b(zambia|zimbab|nigeria|ghana|adventist|sabbath|muslim|islam|church|halal|jollof)/i;
  const pub = Object.values(db.users).filter((u) => leak.test(u.bio ?? "") || u.prompts.some((p) => leak.test(p.answer)));
  check(pub.length === 0, "no heritage or faith words in any bio or prompt");
  const planLeak = Object.values(db.suggestions).filter((s) => /\b(because of|sabbath|church)\b/i.test(JSON.stringify(s.plan_json) + JSON.stringify(s.trace)));
  check(planLeak.length === 0, "no faith/heritage reasoning in plans or traces");
  const names = Object.values(db.users).map((u) => u.first_name);
  const named = Object.values(db.suggestions).filter((s) => names.some((n) => new RegExp(`\\b${n}\\b`).test(JSON.stringify(s.trace) + s.plan_json.reason)));
  check(named.length === 0, "no member names in traces or reasons (counts only, D11)");
  check(!/encrypt/i.test(json), 'the word "encrypted" never appears in the seed (D16)');
  check(Object.values(db.suggestions).every((s) => db.venues[s.venue_id]?.active || s.status === "replaced" && db.venues[s.venue_id]), "every seeded plan uses a known venue");
  check(Object.values(db.suggestions).every((s) => db.venues[s.venue_id].active), "every seeded plan uses an ACTIVE venue");
  check(Object.values(db.suggestions).every((s) => !/forecast.*\d+\s*°|\d+%/i.test(JSON.stringify(s.trace))), "no forecast numbers in any trace");
  check(Object.values(db.runItBack).every((r) => !JSON.stringify(r).includes("names")), "run-it-back stored privately (responses only)");

  if (rosterOut) {
    fs.writeFileSync(rosterOut, JSON.stringify({ users: Object.values(db.users).map((u) => ({ id: u.id })), pods: pods.map((p) => ({ id: p.id, hue: p.hue })) }));
    console.log(`\nroster written to ${rosterOut}`);
  }
  if (bytes >= 2 * 1024 * 1024) fail("seed >= 2 MB: move the store to IndexedDB (ARCHITECTURE §0)");
} catch (e) {
  console.error(e);
  failed++;
} finally {
  await server.close();
}
console.log(failed ? `\n${failed} problem(s)` : "\nall checks passed");
process.exit(failed ? 1 : 0);
