// L03 Terms. Labelled rows (wireframes L03), conservative (library B #1), with the contact line (V3_SPEC §6.1.4).
import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { CONTACT, CONTACT_EMAIL, CONTACT_HREF } from "@/components/legal/contact";

export const metadata: Metadata = { title: "Terms", description: "Who Pods is for and what we ask of you." };

export default function TermsPage() {
  return (
    <LegalPage
      here="/terms"
      title="Terms"
      rows={[
        { id: "who", label: "Who", line: "18 and up." },
        { id: "show", label: "Show up", line: "Can’t make it? Free your seat." },
        { id: "kind", label: "Be kind", line: "We remove people who aren’t." },
        { id: "write", label: CONTACT.label, line: CONTACT_EMAIL, href: CONTACT_HREF },
      ]}
    />
  );
}
