"use client";

import { ClipboardList, Home, Library, ListChecks, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { buttonVariants } from "@/components/ui/button";
import { parseStored, readPrototypeRaw, subscribePrototype } from "@/lib/storage";
import { assessmentPresence, desktopNav, footerLinks, mobileMenuLinks, mobileNav, prominentCta, routes } from "@/lib/site";
import { cn } from "@/lib/utils";

const mobileIcons = [Home, Library, ClipboardList, ListChecks] as const;

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const chatLayout = pathname === routes.ask;
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-[#092451] focus:ring-2 focus:ring-[#092451]"
      >
        Skip to content
      </a>
      <SiteHeader />
      <div
        id="content"
        className={chatLayout ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "min-h-0 flex-1 overflow-y-auto pb-10 md:pb-0"}
      >
        {children}
        {chatLayout ? null : <SiteFooter />}
      </div>
      <MobileNav />
    </div>
  );
}

function usePresence() {
  const raw = useSyncExternalStore(subscribePrototype, readPrototypeRaw, () => null);
  const saved = raw ? parseStored(raw) : null;
  return assessmentPresence(saved?.assessment ?? null);
}

function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <Link href={routes.home} className="flex items-center gap-2 rounded-lg focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:outline-none">
      <Image src="/brand/upwardia-mark.png" alt="" width={208} height={253} className={compact ? "h-9 w-auto" : "h-11 w-auto"} />
      <span className={cn("font-semibold tracking-tight text-[#092451]", compact ? "text-lg" : "text-xl")}>Upwardia</span>
    </Link>
  );
}

function SiteHeader() {
  const pathname = usePathname();
  const presence = usePresence();
  const cta = prominentCta(presence);
  const menuId = useId();
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const open = menuPath === pathname;
  const menuLinks = mobileMenuLinks();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuPath(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="z-30 shrink-0 border-b border-[#e4e0d8] bg-[#f4f1ea]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <BrandLockup compact />
        <nav aria-label="Primary" className="hidden items-center justify-end gap-1 md:flex md:flex-wrap">
          {desktopNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-[#092451] hover:bg-white focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:outline-none",
                pathname === item.href && "bg-white",
              )}
            >
              {item.label}
            </Link>
          ))}
          {cta && (
            <Link href={cta.href} className={cn(buttonVariants(), "ml-2 h-10 px-4 text-sm")}>
              {cta.label}
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#092451] hover:bg-white focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:outline-none"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setMenuPath(open ? null : pathname)}
          >
            {open ? <X aria-hidden /> : <Menu aria-hidden />}
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </div>
      {cta && (
        <div className="px-4 pb-3 md:hidden">
          <Link href={cta.href} className={cn(buttonVariants(), "h-11 w-full text-base")}>
            {cta.label}
          </Link>
        </div>
      )}
      {open && (
        <nav id={menuId} aria-label="More" className="border-t border-[#e4e0d8] px-4 py-3 md:hidden">
          <ul className="flex flex-col gap-1">
            {menuLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMenuPath(null)}
                  className="block rounded-lg px-3 py-3 text-base font-medium text-[#092451] hover:bg-white focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:outline-none"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

function MobileNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Sections" className="z-40 shrink-0 border-t border-[#e4e0d8] bg-white md:hidden">
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-4">
        {mobileNav.map((item, index) => {
          const Icon = mobileIcons[index] ?? Home;
          const current = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-xs font-medium text-[#092451] focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:outline-none",
                  current && "bg-[#f4f1ea]",
                )}
              >
                <Icon aria-hidden className="size-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-[#e4e0d8] bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-stone-600">Upwardia. Answers in the assessment stay on this device.</p>
        <ul className="flex flex-col gap-2 sm:flex-row sm:gap-4">
          {footerLinks.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="text-sm font-medium text-[#092451] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:outline-none">
                {item.label}
                <span className="ml-2 rounded-full bg-[#f4f1ea] px-2 py-0.5 text-xs font-semibold text-[#092451]">{item.note}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
