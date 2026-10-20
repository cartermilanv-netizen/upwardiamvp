import type { ReactNode } from "react";
import Link from "next/link";
import { hrefFor } from "@/lib/impact/query";
import type { AppliedFilters, Principal } from "@/lib/impact/types";

const LINKS = [
  { href: "/impact", label: "Overview" },
  { href: "/impact/funnel", label: "Funnel" },
  { href: "/impact/health", label: "Community health" },
] as const;

export function ImpactShell({
  principal,
  filters,
  current,
  logout,
  children,
}: {
  principal: Principal;
  filters: AppliedFilters;
  current: "/impact" | "/impact/funnel" | "/impact/health";
  logout: (formData: FormData) => Promise<void>;
  children: ReactNode;
}) {
  return (
    <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="bg-[#092451] text-white lg:min-h-[calc(100dvh-2.75rem)]">
        <div className="flex items-center justify-between gap-3 px-4 py-4 lg:block">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-[#FFC928]">UPWARDIA</p>
            <p className="text-2xl font-semibold tracking-tight">Impact</p>
            <p className="mt-1 text-sm text-white/75">{principal.displayName}</p>
          </div>
          <form action={logout} className="lg:mt-6">
            <button type="submit" className="rounded-lg border border-white/20 px-3 py-2 text-sm font-medium text-white hover:bg-white/10">
              Sign out
            </button>
          </form>
        </div>
        <nav aria-label="Impact" className="flex gap-1 overflow-x-auto px-3 pb-4 lg:flex-col">
          {LINKS.map((link) => {
            const active = link.href === current;
            return (
              <Link
                key={link.href}
                href={hrefFor(link.href, filters)}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap ${active ? "bg-[#FFC928] text-[#092451]" : "text-white hover:bg-white/10"}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 px-4 py-5 sm:px-6 lg:px-8">
        <a href="#impact-report" className="sr-only focus:not-sr-only focus:mb-3 focus:inline-block focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
          Skip to report
        </a>
        {children}
      </div>
    </div>
  );
}
