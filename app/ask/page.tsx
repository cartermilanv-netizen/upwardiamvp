import type { Metadata } from "next";
import { Suspense } from "react";
import { AskUpwardia } from "@/components/ask-upwardia";

export const metadata: Metadata = {
  title: "Ask Upwardia | Upwardia",
  description: "Ask a question. Answers can cite only the verified resource catalog.",
};

export default function AskPage() {
  return (
    <Suspense fallback={<main className="px-4 py-10 text-stone-700">Loading…</main>}>
      <AskUpwardia />
    </Suspense>
  );
}
