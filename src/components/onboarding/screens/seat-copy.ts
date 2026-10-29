// Keep your seat copy that changes by mode. Pure, so it is tested without a browser.

/** The line under the code dots. Live (beta, no texts): any six digits pass, so say so. Demo keeps the film's words. */
export function codeHint(live: boolean): string {
  return live ? "No text yet while we're in beta. Enter any 6 digits." : "Six digits, sent by text.";
}
