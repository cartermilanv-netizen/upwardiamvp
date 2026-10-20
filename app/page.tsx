import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { hero, howItWorks } from "@/lib/site";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto grid w-full max-w-6xl gap-3 px-4 pt-3 pb-2 sm:gap-8 sm:py-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <div className="flex items-center gap-3">
            <Image src="/brand/upwardia-wordmark.png" alt="Upwardia" width={697} height={253} className="h-9 w-auto sm:h-16" priority />
          </div>
          <p className="mt-2 text-xs font-semibold tracking-wide text-[#092451] uppercase sm:mt-5 sm:text-sm">{hero.tagline}</p>
          <h1 className="mt-2 max-w-xl text-[1.7rem] leading-tight font-semibold tracking-tight text-balance text-[#092451] sm:mt-3 sm:text-5xl sm:leading-tight">{hero.headline}</h1>
          <div className="mt-2 h-1.5 w-16 rounded-full bg-[#FFC928] sm:mt-4" aria-hidden />
          <p className="mt-2 max-w-xl text-base leading-snug text-stone-700 sm:mt-5 sm:text-lg sm:leading-relaxed">{hero.body}</p>
          <div className="mt-3 flex flex-col gap-2 sm:mt-7 sm:flex-row sm:gap-3">
            <Link href={hero.primaryHref} className={cn(buttonVariants(), "h-12 px-5 text-base")}>
              {hero.primaryLabel}
            </Link>
            <Link
              href={hero.secondaryHref}
              className={cn(buttonVariants({ variant: "outline" }), "h-12 bg-white px-5 text-base text-[#092451]")}
            >
              {hero.secondaryLabel}
            </Link>
          </div>
        </div>
        <aside className="rounded-3xl bg-[#092451] p-3 text-white sm:p-8">
          <p className="text-sm font-semibold tracking-wide text-white uppercase">On this device</p>
          <p className="mt-1 text-lg leading-snug font-semibold tracking-tight sm:mt-3 sm:text-2xl sm:leading-tight">A private assessment. A plan you can come back to.</p>
          <p className="mt-1 text-sm leading-snug text-white/85 sm:mt-3 sm:leading-relaxed">
            Your answers are not uploaded. When a verified catalog is empty, the plan says so instead of inventing a program.
          </p>
        </aside>
      </section>

      <section className="bg-white" aria-labelledby="how-it-works">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:py-16">
          <h2 id="how-it-works" className="text-2xl font-semibold text-[#092451] sm:text-3xl">
            How it works
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-[#e4e0d8] bg-[#f4f1ea] p-5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#FFC928] text-sm font-semibold text-[#092451]">
                  {index + 1}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-[#092451]">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-700">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="about" className="scroll-mt-24 mx-auto w-full max-w-6xl px-4 py-12 sm:py-16">
        <h2 className="text-2xl font-semibold text-[#092451] sm:text-3xl">About Upwardia</h2>
        <div className="mt-4 max-w-2xl space-y-3 text-base leading-relaxed text-stone-700">
          <p>
            Upwardia helps people find community resources and see the steps between where they are and the support they need.
          </p>
          <p>
            The household assessment is the first step on this site. It is optional if you only want to browse categories. A match appears only when a listing has been verified. An empty list stays empty.
          </p>
        </div>
      </section>
    </main>
  );
}
