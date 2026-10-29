// The one contact point (V3_SPEC §6.1.4): Settings, the safety centre, the pod menu, sign-up and the legal pages.
// Change it here only.
//
// FOUNDER: no inbox is owned yet. Set CONTACT_INBOX to the real address (for example "help@<your domain>") and every
// "Write to us" becomes a mail link. Until then nothing points at an unowned domain: the rows open the public
// help page (/safety) instead, and the in-app lists show "Help and guidelines" rather than promising a reply.
export const CONTACT_INBOX: string | null = null;

export interface Contact {
  /** True once a real inbox is set. */
  ready: boolean;
  href: string;
  /** Opens outside the app (mail) when true. */
  external: boolean;
  /** Row label: "Write to us" with an inbox, else "Help and guidelines". */
  label: string;
  /** The visible line: the address, or the help page. */
  line: string;
}

export function contactFor(inbox: string | null): Contact {
  return inbox
    ? { ready: true, href: `mailto:${inbox}`, external: true, label: "Write to us", line: inbox }
    : { ready: false, href: "/safety", external: false, label: "Help and guidelines", line: "Help and guidelines" };
}

export const CONTACT: Contact = contactFor(CONTACT_INBOX);
// Older names, kept for the legal pages and sign-up.
export const CONTACT_EMAIL = CONTACT.line;
export const CONTACT_HREF = CONTACT.href;
