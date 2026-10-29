// Editing your birthday from the profile. Pure, so the rules are tested apart from the page.
import { ageOn } from "@/lib/utils";

/** Why a birthday can't be saved from the profile, or null when it can. A typo under 18 never reaches the
 *  sign-up hard stop (which removes the account); it is refused here with a plain line instead. */
export function birthdayProblem(dob: string, nowISO: string, limits: { minAge: number; maxAge: number }): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(Date.parse(dob))) return "Enter a real date.";
  const age = ageOn(dob, nowISO);
  if (age < 0) return "Enter a real date.";
  if (age < limits.minAge) return `Pods is for ${limits.minAge} and older.`;
  if (age > limits.maxAge) return `Pods is for ${limits.minAge} to ${limits.maxAge} for now.`;
  return null;
}
