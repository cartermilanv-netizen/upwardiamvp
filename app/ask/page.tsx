import type { Metadata } from "next";
import { UnfinishedPage } from "@/components/unfinished-page";

export const metadata: Metadata = { title: "Ask Upwardia | Upwardia" };

export default function AskPage() {
  return (
    <UnfinishedPage
      title="Ask Upwardia"
      purpose="A helper that answers from approved sources is not built. This page does not send a question anywhere and does not fill or submit an application."
    />
  );
}
