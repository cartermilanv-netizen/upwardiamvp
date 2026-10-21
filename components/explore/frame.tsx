import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export function ExploreBack({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center gap-2 self-start rounded-lg px-2 text-base font-semibold text-[#092451] hover:bg-white focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:outline-none"
    >
      <ArrowLeft aria-hidden className="size-5" />
      {label}
    </Link>
  );
}

export function ExploreCrumbs({ items }: { items: readonly { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-stone-600">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 && <ChevronRight aria-hidden className="size-4 text-stone-400" />}
              {item.href && !last ? (
                <Link href={item.href} className="font-medium text-[#092451] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:outline-none">
                  {item.label}
                </Link>
              ) : (
                <span className={last ? "font-semibold text-[#092451]" : undefined} aria-current={last ? "page" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function ExploreMain({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:gap-6 sm:py-8">{children}</main>;
}

export function YellowRule() {
  return <div className="mt-2 h-1.5 w-16 rounded-full bg-[#FFC928]" aria-hidden />;
}
