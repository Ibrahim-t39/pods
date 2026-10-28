// [U2] Heritage and faith ladders (ARCHITECTURE §9.1 step 5.2). Pure data + helpers; U3's placement engine widens along these.
// Heritage: country -> region -> continent. Faith: denomination -> tradition -> religion.
// Sensitive: only placement/* and admin read the identities that use these codes.
import type { FaithValue, HeritageValue } from "@/lib/types";

export interface HeritageNode { code: string; label: string; level: HeritageValue["level"]; parent: string | null }
export interface FaithNode { code: string; label: string; level: FaithValue["level"]; parent: string | null }

const C = (code: string, label: string, parent: string): HeritageNode => ({ code, label, level: "country", parent });
const R = (code: string, label: string, parent: string): HeritageNode => ({ code, label, level: "region", parent });
const K = (code: string, label: string): HeritageNode => ({ code, label, level: "continent", parent: null });

export const HERITAGE_NODES: HeritageNode[] = [
  K("african", "African"),
  K("americas", "Americas"),
  K("asian", "Asian"),
  K("european", "European"),
  R("southern_african", "Southern African", "african"),
  R("west_african", "West African", "african"),
  R("east_african", "East African", "african"),
  R("north_african", "North African", "african"),
  R("central_african", "Central African", "african"),
  R("caribbean", "Caribbean", "americas"),
  R("latin_american", "Latin American", "americas"),
  R("south_asian", "South Asian", "asian"),
  R("east_asian", "East Asian", "asian"),
  R("southeast_asian", "Southeast Asian", "asian"),
  R("western_european", "Western European", "european"),
  C("ZM", "Zambian", "southern_african"),
  C("ZW", "Zimbabwean", "southern_african"),
  C("ZA", "South African", "southern_african"),
  C("BW", "Motswana", "southern_african"),
  C("MW", "Malawian", "southern_african"),
  C("MZ", "Mozambican", "southern_african"),
  C("NA", "Namibian", "southern_african"),
  C("LS", "Basotho", "southern_african"),
  C("SZ", "Swazi", "southern_african"),
  C("NG", "Nigerian", "west_african"),
  C("GH", "Ghanaian", "west_african"),
  C("SN", "Senegalese", "west_african"),
  C("SL", "Sierra Leonean", "west_african"),
  C("LR", "Liberian", "west_african"),
  C("CI", "Ivorian", "west_african"),
  C("KE", "Kenyan", "east_african"),
  C("ET", "Ethiopian", "east_african"),
  C("UG", "Ugandan", "east_african"),
  C("TZ", "Tanzanian", "east_african"),
  C("SO", "Somali", "east_african"),
  C("EG", "Egyptian", "north_african"),
  C("MA", "Moroccan", "north_african"),
  C("CM", "Cameroonian", "central_african"),
  C("CD", "Congolese", "central_african"),
  C("JM", "Jamaican", "caribbean"),
  C("HT", "Haitian", "caribbean"),
  C("TT", "Trinidadian", "caribbean"),
  C("MX", "Mexican", "latin_american"),
  C("CO", "Colombian", "latin_american"),
  C("SV", "Salvadoran", "latin_american"),
  C("IN", "Indian", "south_asian"),
  C("PK", "Pakistani", "south_asian"),
  C("BD", "Bangladeshi", "south_asian"),
  C("CN", "Chinese", "east_asian"),
  C("KR", "Korean", "east_asian"),
  C("PH", "Filipino", "southeast_asian"),
  C("VN", "Vietnamese", "southeast_asian"),
];

const D = (code: string, label: string, parent: string): FaithNode => ({ code, label, level: "denomination", parent });
const T = (code: string, label: string, parent: string): FaithNode => ({ code, label, level: "tradition", parent });
const Z = (code: string, label: string): FaithNode => ({ code, label, level: "religion", parent: null });

export const FAITH_NODES: FaithNode[] = [
  Z("christian", "Christian"),
  Z("islam", "Islam"),
  Z("hindu", "Hindu"),
  Z("jewish", "Jewish"),
  Z("buddhist", "Buddhist"),
  T("protestant", "Protestant Christian", "christian"),
  T("catholic_tradition", "Catholic Christian", "christian"),
  T("muslim", "Muslim", "islam"),
  D("sda", "Seventh-day Adventist", "protestant"),
  D("baptist", "Baptist", "protestant"),
  D("pentecostal", "Pentecostal", "protestant"),
  D("nondenominational", "Non-denominational Christian", "protestant"),
  D("methodist", "Methodist", "protestant"),
  D("catholic", "Catholic", "catholic_tradition"),
  D("sunni", "Muslim (Sunni)", "muslim"),
  D("shia", "Muslim (Shia)", "muslim"),
];

const hById = new Map(HERITAGE_NODES.map((n) => [n.code, n]));
const fById = new Map(FAITH_NODES.map((n) => [n.code, n]));

export const heritageNode = (code: string) => hById.get(code);
export const faithNode = (code: string) => fById.get(code);

/** Full ladder from a value up: [self, parent, grandparent]. */
export function heritageLadder(code: string): HeritageNode[] {
  const out: HeritageNode[] = [];
  for (let n = hById.get(code); n; n = n.parent ? hById.get(n.parent) : undefined) out.push(n);
  return out;
}
export function faithLadder(code: string): FaithNode[] {
  const out: FaithNode[] = [];
  for (let n = fById.get(code); n; n = n.parent ? fById.get(n.parent) : undefined) out.push(n);
  return out;
}
/** Ancestor of `code` at `level`, or undefined. */
export const heritageAt = (code: string, level: HeritageValue["level"]) => heritageLadder(code).find((n) => n.level === level);
export const faithAt = (code: string, level: FaithValue["level"]) => faithLadder(code).find((n) => n.level === level);
/** Does a person with `code` belong to a group keyed `topicKey` (same node or any ancestor)? */
export const heritageInGroup = (code: string, topicKey: string) => heritageLadder(code).some((n) => n.code === topicKey);
export const faithInGroup = (code: string, topicKey: string) => faithLadder(code).some((n) => n.code === topicKey);
