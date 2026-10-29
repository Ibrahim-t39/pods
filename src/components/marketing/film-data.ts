// Pure facts the landing film and /try share with their tests (no React, no CSS).

/** the pod's first eight hangouts, one every two weeks; hours add up per hangout (2-3h, the birthday runs long) */
export const WEEKS = [
  { n: 1, what: "Pickup basketball", came: 4, hrs: 2 },
  { n: 2, what: "Pickup basketball", came: 5, hrs: 4 },
  { n: 3, what: "Run, then coffee", came: 5, hrs: 7 },
  { n: 4, what: "Pickup basketball", came: 6, hrs: 9 },
  { n: 5, what: "Game night", came: 6, hrs: 12 },
  { n: 6, what: "Trail walk", came: 7, hrs: 15 },
  { n: 7, what: "Pickup basketball", came: 7, hrs: 17 },
  { n: 8, what: "Nia's birthday", came: 8, hrs: 21 },
];
/** the hours line under a hangout card */
export const hoursLabel = (hrs: number) => (hrs >= 50 ? "50 hours together" : `${hrs} of ~50 hours together`);

const WORDS = ["None", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
/** "Three", "Four"… (capitalised, for the start of a sentence); digits past ten */
export const countWord = (n: number) => WORDS[n] ?? String(n);

/** /try's I'm in line before you tap: the plan's own lock number, and everyone but you already in. */
export function lockLine(lockAt: number): { line: string; sub: string } {
  const already = Math.max(0, lockAt - 1);
  return { line: `It locks at ${lockAt}.`, sub: already === 1 ? "One said yes." : `${countWord(already)} said yes.` };
}
