import type { Metadata } from "next";
import { AskUpwardia } from "@/components/ask-upwardia";

export const metadata: Metadata = {
  title: "Ask Upwardia | Upwardia",
  description: "Ask a question. Answers can cite only the verified resource catalog.",
};

export default function AskPage() {
  return <AskUpwardia />;
}
