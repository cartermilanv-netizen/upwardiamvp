import { Suspense } from "react";
import { ImpactScreen } from "@/app/impact/screen";

export default function ImpactFunnelPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-sm text-[#092451]">Loading the demonstration funnel…</p>}>
      <ImpactScreen searchParams={searchParams} view="funnel" />
    </Suspense>
  );
}
