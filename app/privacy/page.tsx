import type { Metadata } from "next";
import { UnfinishedPage } from "@/components/unfinished-page";

export const metadata: Metadata = { title: "Privacy | Upwardia" };

export default function PrivacyPage() {
  return (
    <UnfinishedPage
      title="Privacy"
      purpose="A privacy notice will explain what stays on this device and what, if anything, is ever sent."
    />
  );
}
