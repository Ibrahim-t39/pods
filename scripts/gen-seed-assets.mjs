// [U2] Generates illustrated avatars (public/avatars/*.svg) and pod covers (public/pods/*.svg).
// Fully procedural, no real faces, no external services. Deterministic: same ids -> same files.
// Run: node scripts/gen-seed-assets.mjs   <roster.json>  (roster from: node scripts/seed-report.mjs --roster <path>)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rosterPath = process.argv[2];
if (!rosterPath) throw new Error("usage: node scripts/gen-seed-assets.mjs <roster.json>  (from: node scripts/seed-report.mjs --roster <path>)");
const roster = JSON.parse(fs.readFileSync(rosterPath, "utf8"));

function hash32(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
function rng(seed) {
  let a = hash32(seed);
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

const SKIN = [
  ["#F1C9A5", "#DDB08A"], ["#E0AC84", "#C98F66"], ["#C68863", "#AD6F4B"], ["#A86F4A", "#8D5836"],
  ["#8A5638", "#704329"], ["#6B3F29", "#552F1D"], ["#52301F", "#3F2316"], ["#3C2417", "#2D1A10"],
];
const HAIR = ["#1C1410", "#2B1B12", "#3A2416", "#5A3A22", "#17120F", "#7A4A2A"];
const BG = [
  ["#FFB298", "#FD6123"], ["#FF8D66", "#DF4B01"], ["#A7C9FE", "#1B78FE"], ["#68A3FF", "#0161DD"],
  ["#81DEB1", "#19C185"], ["#52D199", "#05A771"], ["#F5BC6A", "#F2AB37"], ["#D3F7E3", "#52D199"], ["#E3EEFE", "#68A3FF"],
];
const SHIRT = ["#19191C", "#FFFFFF", "#0161DD", "#DF4B01", "#05A771", "#F2AB37", "#6B7280", "#A7C9FE", "#FFB298", "#374151"];

function hairBack(style, c) {
  switch (style) {
    case "afro": return `<circle cx="128" cy="96" r="62" fill="${c}"/>`;
    case "long": return `<path d="M64 100 C64 40 192 40 192 100 L196 190 L60 190 Z" fill="${c}"/>`;
    case "locs": return `<path d="M66 98 C66 44 190 44 190 98 L194 170 Q186 188 178 170 L176 110 L80 110 L78 170 Q70 188 62 170 Z" fill="${c}"/>`;
    case "bun": return `<circle cx="128" cy="40" r="22" fill="${c}"/>`;
    case "puff": return `<circle cx="128" cy="44" r="26" fill="${c}"/><circle cx="104" cy="52" r="16" fill="${c}"/><circle cx="152" cy="52" r="16" fill="${c}"/>`;
    default: return "";
  }
}
function hairFront(style, c) {
  switch (style) {
    case "buzz": return `<path d="M82 92 C82 56 174 56 174 92 C160 78 96 78 82 92 Z" fill="${c}"/>`;
    case "short": return `<path d="M80 98 C76 52 180 52 176 98 C164 80 150 74 128 74 C108 74 92 82 80 98 Z" fill="${c}"/>`;
    case "curly": return `<g fill="${c}"><circle cx="92" cy="78" r="16"/><circle cx="114" cy="66" r="17"/><circle cx="140" cy="66" r="17"/><circle cx="164" cy="78" r="16"/><circle cx="128" cy="72" r="16"/></g>`;
    case "fade": return `<path d="M84 90 C84 58 172 58 172 90 C160 72 100 72 84 90 Z" fill="${c}"/>`;
    case "afro": return `<path d="M82 92 C90 66 166 66 174 92 C160 80 96 80 82 92 Z" fill="${c}"/>`;
    case "long": return `<path d="M80 100 C80 56 176 56 176 100 C168 80 150 72 128 72 C106 72 90 80 80 100 Z" fill="${c}"/>`;
    case "locs": return `<path d="M80 100 C80 58 176 58 176 100 C166 82 150 76 128 76 C106 76 90 82 80 100 Z" fill="${c}"/>`;
    case "bun":
    case "puff": return `<path d="M80 100 C80 62 176 62 176 100 C166 84 150 78 128 78 C106 78 90 84 80 100 Z" fill="${c}"/>`;
    default: return "";
  }
}
const STYLES = ["buzz", "short", "curly", "fade", "afro", "long", "locs", "bun", "puff"];

function avatar(id, opts = {}) {
  const r = rng("avatar:" + id);
  const skin = opts.skin ?? pick(r, SKIN);
  const hair = pick(r, HAIR);
  const [b1, b2] = pick(r, BG);
  const shirt = pick(r, SHIRT);
  const style = opts.style ?? pick(r, STYLES);
  const glasses = r() < 0.22;
  const smile = 0.6 + r() * 0.5;
  const gid = "g" + hash32(id).toString(36);
  const dark = shirt === "#FFFFFF" ? "#E5E7EB" : shirt;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="Illustrated avatar">
<defs><linearGradient id="${gid}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${b1}"/><stop offset="1" stop-color="${b2}"/></linearGradient>
<radialGradient id="${gid}s" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="${skin[0]}"/><stop offset="1" stop-color="${skin[1]}"/></radialGradient>
<clipPath id="${gid}c"><rect width="256" height="256"/></clipPath></defs>
<g clip-path="url(#${gid}c)">
<rect width="256" height="256" fill="url(#${gid}b)"/>
<circle cx="214" cy="40" r="52" fill="#fff" opacity=".14"/><circle cx="30" cy="230" r="70" fill="#000" opacity=".06"/>
${hairBack(style, hair)}
<path d="M30 270 C30 206 74 182 128 182 C182 182 226 206 226 270 Z" fill="${dark}"/>
<path d="M104 176 L152 176 L150 200 Q128 214 106 200 Z" fill="${skin[1]}"/>
<rect x="108" y="146" width="40" height="46" rx="18" fill="${skin[1]}"/>
<ellipse cx="128" cy="112" rx="46" ry="52" fill="url(#${gid}s)"/>
<ellipse cx="82" cy="116" rx="8" ry="12" fill="${skin[1]}"/><ellipse cx="174" cy="116" rx="8" ry="12" fill="${skin[1]}"/>
${hairFront(style, hair)}
<g fill="#1B1210"><ellipse cx="110" cy="114" rx="4.2" ry="5.2"/><ellipse cx="146" cy="114" rx="4.2" ry="5.2"/></g>
<path d="M${128 - 14 * smile} 138 Q128 ${138 + 14 * smile} ${128 + 14 * smile} 138" fill="none" stroke="#1B1210" stroke-width="3.4" stroke-linecap="round"/>
${glasses ? `<g fill="none" stroke="#19191C" stroke-width="3"><circle cx="110" cy="114" r="13"/><circle cx="146" cy="114" r="13"/><path d="M123 114h10"/></g>` : ""}
</g></svg>
`;
}

fs.mkdirSync(path.join(root, "public/avatars"), { recursive: true });
fs.mkdirSync(path.join(root, "public/pods"), { recursive: true });
let n = 0;
for (const u of roster.users) { fs.writeFileSync(path.join(root, "public/avatars", `${u.id}.svg`), avatar(u.id, { style: u.hair })); n++; }
// Preset avatars for onboarding ("choose an illustrated avatar", BLUEPRINT edge case 7).
for (let i = 1; i <= 12; i++) { fs.writeFileSync(path.join(root, "public/avatars", `preset-${String(i).padStart(2, "0")}.svg`), avatar("preset-" + i)); n++; }

// Pod covers: three overlapping translucent discs in the pod hue family (no member dots; ThreeCircleArt adds those live).
const HUES = {
  ember: ["#FD6123", "#FF8D66", "#F2AB37", "#FEE7E0", "#DF4B01"],
  signal: ["#1B78FE", "#68A3FF", "#19C185", "#E3EEFE", "#0161DD"],
  grove: ["#19C185", "#52D199", "#1B78FE", "#D3F7E3", "#05A771"],
};
function cover(pod) {
  const r = rng("cover:" + pod.id);
  const [a, b, c, bg, deep] = HUES[pod.hue];
  const rot = r() * Math.PI * 2;
  const R = 70 + r() * 10, d = 46 + r() * 12;
  const ctr = [0, 1, 2].map((i) => [128 + Math.cos(rot + (i * Math.PI * 2) / 3) * d, 128 + Math.sin(rot + (i * Math.PI * 2) / 3) * d]);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="Pod cover art">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="${a}" stop-opacity=".35"/></linearGradient></defs>
<rect width="256" height="256" fill="url(#bg)"/>
<g style="mix-blend-mode:multiply"><circle cx="${ctr[0][0].toFixed(1)}" cy="${ctr[0][1].toFixed(1)}" r="${R.toFixed(1)}" fill="${a}" fill-opacity=".72"/>
<circle cx="${ctr[1][0].toFixed(1)}" cy="${ctr[1][1].toFixed(1)}" r="${R.toFixed(1)}" fill="${b}" fill-opacity=".7"/>
<circle cx="${ctr[2][0].toFixed(1)}" cy="${ctr[2][1].toFixed(1)}" r="${R.toFixed(1)}" fill="${c}" fill-opacity=".62"/></g>
<circle cx="128" cy="128" r="${(R * 0.34).toFixed(1)}" fill="${deep}" fill-opacity=".18"/>
</svg>
`;
}
for (const p of roster.pods) { fs.writeFileSync(path.join(root, "public/pods", `${p.id}.svg`), cover(p)); n++; }
console.log(`wrote ${n} svg files`);
