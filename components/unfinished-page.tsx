import Link from "next/link";
import { routes } from "@/lib/site";

export function UnfinishedPage({ title, purpose }: { title: string; purpose: string }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10">
      <p className="text-sm font-semibold tracking-wide text-[#092451] uppercase">Not finished</p>
      <h1 className="text-3xl font-semibold tracking-tight text-[#092451]">{title}</h1>
      <p className="text-base leading-relaxed text-stone-700">
        {purpose} This page is a placeholder. It is not a finished policy, statement, or contact path.
      </p>
      <Link href={routes.home} className="text-sm font-medium text-[#092451] underline-offset-4 hover:underline">
        Back to home
      </Link>
    </main>
  );
}
