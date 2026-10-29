// L01 Privacy. Labelled rows (wireframes L01). Claims are only what the product does today (library B #3).
// Names the AI once (Claude, by Anthropic: the one disclosure line allowed in user copy) and the opt-out (library I #2; Apple 5.1.2(i)).
import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { CONTACT, CONTACT_EMAIL, CONTACT_HREF } from "@/components/legal/contact";

export const metadata: Metadata = { title: "Privacy", description: "What Pods keeps, who sees it, and how to delete it." };

export default function PrivacyPage() {
  return (
    <LegalPage
      here="/privacy"
      title="Privacy"
      rows={[
        {
          id: "keep",
          label: "What we keep",
          line: "Name, age, number, likes, times.",
          more: <p>Your first name, age, phone number, what you like and when you are usually free. Nothing else is needed to place you.</p>,
        },
        {
          id: "who",
          label: "Who sees it",
          line: "Your pods: first name, age.",
          more: (
            <>
              <p>People in your pods see your first name, age and likes. Nobody sees your number.</p>
              <p>Community pods are opt-in. Only their members see you there.</p>
            </>
          ),
        },
        {
          id: "ai",
          label: "AI",
          line: "Plans from free times. Turn it off in Settings.",
          more: (
            <p>
              AI plans each hangout from the pod&apos;s free times and a list of public places. It does not get your name or number. The AI is
              Claude, made by Anthropic. Turn it off in Settings and hangouts are planned from free times alone.
            </p>
          ),
        },
        {
          id: "delete",
          label: "Delete",
          line: "Delete everything from Settings.",
          more: <p>Delete my account, in Settings, removes your account and everything you told us.</p>,
        },
        { id: "write", label: CONTACT.label, line: CONTACT_EMAIL, href: CONTACT_HREF },
      ]}
    />
  );
}
