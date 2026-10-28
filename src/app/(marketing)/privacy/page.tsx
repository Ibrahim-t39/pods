// L01 Privacy. Labelled rows (wireframes L01). Claims are only what the product does today (library B #3).
// Names Claude and the opt-out (library I #2; Apple 5.1.2(i)).
import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { CONTACT_EMAIL, CONTACT_HREF } from "@/components/legal/contact";

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
          id: "claude",
          label: "Claude",
          line: "Plans from free times. Off in Your seat.",
          more: (
            <p>
              Claude, an AI model made by Anthropic, plans each hangout from the pod&apos;s free times and a list of public places. It does not get
              your name or number. Turn it off in Your seat and hangouts are planned from free times alone.
            </p>
          ),
        },
        {
          id: "delete",
          label: "Delete",
          line: "Everything, from Your seat.",
          more: <p>Delete my seat removes your account and what you told us.</p>,
        },
        { id: "write", label: "Write to us", line: CONTACT_EMAIL, href: CONTACT_HREF },
      ]}
    />
  );
}
