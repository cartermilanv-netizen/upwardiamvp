"use client";

export default function ImpactError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-2xl font-semibold text-[#092451]">The demonstration report did not load</h1>
      <p className="mt-3 text-sm leading-6 text-[#3d4a5c]">Demonstration data. These numbers are not actual Upwardia results. Try the report again.</p>
      <button type="button" onClick={() => reset()} className="mt-5 h-11 rounded-lg bg-[#092451] px-4 text-sm font-semibold text-white">
        Try again
      </button>
    </main>
  );
}
