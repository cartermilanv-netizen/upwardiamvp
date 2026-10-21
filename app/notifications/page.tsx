import type { Metadata } from "next";
import { NoticesView } from "@/components/journey/notices-view";
import { loadPublishedFacts } from "@/lib/catalog";
import { publishedResidentDeadlines } from "@/lib/journey/logic";

export const metadata: Metadata = {
  title: "Notifications | Upwardia",
  description: "In-app reminders for the demonstration journey. No email, text, or push.",
};

export default function NotificationsPage() {
  return <NoticesView deadlines={publishedResidentDeadlines(loadPublishedFacts())} />;
}
