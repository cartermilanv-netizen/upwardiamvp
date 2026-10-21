import { MONEY_NOTE } from "@/lib/journey/constants";

export function MoneyNote() {
  return (
    <p role="note" className="rounded-xl border border-[#092451] bg-[#fff8e1] px-3 py-2 text-sm leading-relaxed font-medium text-[#092451]">
      {MONEY_NOTE}
    </p>
  );
}

export function ProgressMeter({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-stone-700">Progress</span>
        <span className="font-semibold text-[#092451]">{clamped}%</span>
      </div>
      <div
        className="mt-1 h-2 rounded-full bg-[#e4e0d8]"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className="h-2 rounded-full bg-[#FFC928]" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
