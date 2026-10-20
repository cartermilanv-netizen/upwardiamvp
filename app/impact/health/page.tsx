import { Suspense } from "react";
import { ImpactScreen } from "@/app/impact/screen";

export default function ImpactHealthPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-sm text-[#092451]">Loading the demonstration health report…</p>}>
      <ImpactScreen searchParams={searchParams} view="health" />
    </Suspense>
  );
}
