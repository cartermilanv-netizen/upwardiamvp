import type { Metadata } from "next";
import { ApplicationWorkspace } from "@/components/application-workspace";
import { demonstrationDrafts } from "@/lib/applications/catalog";

export const metadata: Metadata = {
  title: "Application workspace | Upwardia",
  description: "Fill a demonstration application. Nothing is submitted.",
};

export function generateStaticParams() {
  return demonstrationDrafts.map((draft) => ({ id: draft.id }));
}

export default async function ApplicationDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ApplicationWorkspace draftId={id} />;
}
