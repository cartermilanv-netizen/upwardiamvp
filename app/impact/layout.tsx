import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { DatasetBanner } from "@/components/impact/dataset-banner";

export const metadata: Metadata = {
  title: "Upwardia Impact",
  description: "Demonstration analytics for government and organization partners.",
  robots: { index: false, follow: false },
};

export default function ImpactLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#e7edf5] text-[#142033]">
      <Suspense
        fallback={
          <p role="note" className="bg-[#FFC928] px-4 py-2 text-center text-sm font-semibold text-[#092451]">
            Demonstration data. These numbers are not actual Upwardia results.
          </p>
        }
      >
        <DatasetBanner />
      </Suspense>
      {children}
    </div>
  );
}
