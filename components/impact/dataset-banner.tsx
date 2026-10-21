"use client";

import { useSearchParams } from "next/navigation";
import { DISCLAIMER, LIVE_DISCLAIMER } from "@/lib/impact/constants";

export function DatasetBanner() {
  const live = useSearchParams().get("dataset") === "live";
  return (
    <p role="note" className="bg-[#FFC928] px-4 py-2 text-center text-sm font-semibold text-[#092451]">
      {live ? LIVE_DISCLAIMER : DISCLAIMER}
    </p>
  );
}
