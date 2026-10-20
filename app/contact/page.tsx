import type { Metadata } from "next";
import { UnfinishedPage } from "@/components/unfinished-page";

export const metadata: Metadata = { title: "Contact | Upwardia" };

export default function ContactPage() {
  return (
    <UnfinishedPage
      title="Contact"
      purpose="A contact page will say who to write and what they can help with."
    />
  );
}