import { Suspense } from "react";
import { ImpactScreen } from "@/app/impact/screen";

export default function ImpactOverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<ImpactLoading />}>
      <ImpactScreen searchParams={searchParams} view="overview" />
    </Suspense>
  );
}

function ImpactLoading() {
  return <p className="px-4 py-10 text-sm text-[#092451]">Loading the demonstration report…</p>;
}
