import type { Metadata } from "next";
import { UnfinishedPage } from "@/components/unfinished-page";

export const metadata: Metadata = { title: "Accessibility | Upwardia" };

export default function AccessibilityPage() {
  return (
    <UnfinishedPage
      title="Accessibility"
      purpose="An accessibility statement will describe how to use this site and how to report a barrier."
    />
  );
}
