"use client";

import type { FormEvent } from "react";
import type { AppliedFilters, FilterOption } from "@/lib/impact/types";

export function FilterForm({
  filters,
  cities,
  programs,
  categories,
  jurisdictions,
  lockJurisdiction,
  jurisdictionLabel,
}: {
  filters: AppliedFilters;
  cities: FilterOption[];
  programs: FilterOption[];
  categories: FilterOption[];
  jurisdictions: FilterOption[];
  lockJurisdiction: boolean;
  jurisdictionLabel: string;
}) {
  return (
    <form method="get" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" onChange={submitSelects}>
      <input type="hidden" name="dataset" value={filters.dataset} />
      <label className="flex flex-col gap-1 text-sm font-medium text-[#092451]">
        Date range
        <select name="range" defaultValue={filters.range === "custom" ? "custom" : filters.range} className={fieldClass}>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="180">Last 180 days</option>
          <option value="custom">Custom dates</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-[#092451]">
        From
        <input type="date" name="from" defaultValue={filters.from.slice(0, 10)} className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-[#092451]">
        To
        <input type="date" name="to" defaultValue={filters.to.slice(0, 10)} className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-[#092451]">
        Place
        <select name="city" defaultValue={filters.city ?? ""} className={fieldClass}>
          <option value="">All places in scope</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.label}
            </option>
          ))}
        </select>
      </label>
      {lockJurisdiction ? (
        <div className="flex flex-col gap-1 text-sm font-medium text-[#092451]">
          Jurisdiction
          <p className="flex h-11 items-center rounded-lg border border-[#d5dbe6] bg-[#f4f7fb] px-3 font-normal">{jurisdictionLabel}</p>
        </div>
      ) : (
        <label className="flex flex-col gap-1 text-sm font-medium text-[#092451]">
          Jurisdiction
          <select name="jurisdiction" defaultValue={filters.jurisdictionId ?? ""} className={fieldClass}>
            <option value="">All jurisdictions</option>
            {jurisdictions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-1 text-sm font-medium text-[#092451]">
        Program
        <select name="program" defaultValue={filters.programId ?? ""} className={fieldClass}>
          <option value="">All programs</option>
          {programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-[#092451]">
        Category
        <select name="category" defaultValue={filters.category ?? ""} className={fieldClass}>
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end">
        <button type="submit" className="h-11 rounded-lg bg-[#092451] px-4 text-sm font-semibold text-white">
          Apply filters
        </button>
      </div>
    </form>
  );
}

const fieldClass = "h-11 rounded-lg border border-[#d5dbe6] bg-white px-3 text-sm font-normal text-[#142033]";

function submitSelects(event: FormEvent<HTMLFormElement>) {
  const target = event.target;
  if (target instanceof HTMLSelectElement) event.currentTarget.requestSubmit();
}
