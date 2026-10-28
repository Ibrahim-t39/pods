// [U2] Sensitive identity for the simulated members (heritage + faith). Read only by placement/* and admin.
// Exactly 3 Zambians live in the metro in this seed: Mwila and Bupe here, plus Chanda (created live by onboarding).
// That is why her heritage pod widens Zambian -> Southern African (BLUEPRINT §0, ARCHITECTURE §11).
import type { FaithValue, HeritageValue, UserIdentity } from "@/lib/types";
import { botId } from "./users";
import { at } from "./time";

const H = (code: string): HeritageValue => ({ level: "country", code });
const F = (code: string): FaithValue => ({ level: "denomination", code });

/** name -> [heritage country code | null, faith denomination code | null] */
const ROWS: Record<string, [string | null, string | null]> = {
  // Southern African pod
  Mwila: ["ZM", null], Bupe: ["ZM", null], Tendai: ["ZW", null], Lindiwe: ["ZA", null], Mpho: ["BW", null], Kondwani: ["MW", null],
  // West African pod
  Chidi: ["NG", null], Ngozi: ["NG", null], Kwame: ["GH", null], Abena: ["GH", null], Femi: ["NG", null], Aminata: ["SL", null],
  // Seventh-day Adventist pod
  Grace: [null, "sda"], Josiah: [null, "sda"], Naomi: [null, "sda"], Caleb: [null, "sda"], Esther: [null, "sda"], Micah: [null, "sda"], Abigail: [null, "sda"],
  // Muslim pod (denominations differ, so the group is the tradition level)
  Yusuf: [null, "sunni"], Amira: [null, "sunni"], Zainab: [null, "sunni"], Idris: [null, "sunni"], Hamza: [null, "shia"], Layla: [null, "sunni"],
  // People who shared heritage but have too few neighbors for a pod yet (waitlist demo, edge case 9)
  Mei: ["CN", null], Rohan: ["IN", null], Nadia: ["EG", null],
};

export function buildIdentities(): Record<string, UserIdentity> {
  const out: Record<string, UserIdentity> = {};
  for (const [name, [h, f]] of Object.entries(ROWS)) {
    out[botId(name)] = {
      user_id: botId(name),
      heritage: h ? H(h) : null,
      faith: f ? F(f) : null,
      consent_given_at: at("2026-09-30", "12:00"),
    };
  }
  return out;
}

export const SOUTHERN_AFRICAN_NAMES = ["Mwila", "Bupe", "Tendai", "Lindiwe", "Mpho", "Kondwani"] as const;
