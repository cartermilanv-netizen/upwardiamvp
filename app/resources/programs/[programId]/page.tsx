import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProgramDetail } from "@/components/explore/program-detail";
import { residentCatalog } from "@/lib/catalog";

export function generateStaticParams() {
  return residentCatalog.map((entry) => ({ programId: entry.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ programId: string }> }): Promise<Metadata> {
  const { programId } = await params;
  const entry = residentCatalog.find((item) => item.id === programId);
  return {
    title: entry ? `${entry.name} | Upwardia` : "Explore resources | Upwardia",
    description: entry ? "A published listing. This is a possible match, not confirmed eligibility." : "Explore resources.",
  };
}

export default function ProgramPage({ params }: { params: Promise<{ programId: string }> }) {
  return (
    <Suspense fallback={<main className="px-4 py-10 text-stone-700">Loading resource…</main>}>
      <ProgramContent params={params} />
    </Suspense>
  );
}

async function ProgramContent({ params }: { params: Promise<{ programId: string }> }) {
  const { programId } = await params;
  const entry = residentCatalog.find((item) => item.id === programId);
  if (!entry) notFound();
  return <ProgramDetail programId={entry.id} />;
}
