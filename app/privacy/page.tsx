import type { Metadata } from "next";
import { UnfinishedPage } from "@/components/unfinished-page";

export const metadata: Metadata = { title: "Privacy | Upwardia" };

export default function PrivacyPage() {
  return (
    <UnfinishedPage
      title="Privacy"
      purpose="The optional aggregate analytics choice is on My profile. It is off unless you turn it on, and it does not control access to resources or the assessment. A full privacy notice is still to come."
    />
  );
}
