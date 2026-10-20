import { Suspense } from "react";
import { DEMO_LOGINS } from "@/lib/impact/catalog";
import { loginAction } from "@/app/impact/actions";

export default function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <Suspense fallback={<main className="px-4 py-16 text-center text-[#092451]">Loading sign-in…</main>}>
      <LoginBody searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginBody({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const failed = params.error === "1";
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-10">
      <div>
        <p className="text-xs font-semibold tracking-[0.16em] text-[#092451]">UPWARDIA</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#092451]">Impact sign-in</h1>
        <p className="mt-2 text-sm leading-6 text-[#3d4a5c]">
          Government and organization analytics stay behind this sign-in. The resident site does not link here. These accounts are for the demonstration only.
        </p>
      </div>
      <form action={loginAction} className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#092451]/10">
        {failed ? (
          <p role="alert" className="rounded-lg bg-[#fff4f4] px-3 py-2 text-sm text-[#9f1239]">
            That email and password did not match a demonstration account.
          </p>
        ) : null}
        <label className="flex flex-col gap-1 text-sm font-medium text-[#092451]">
          Email
          <input name="email" type="email" autoComplete="username" required className="h-11 rounded-lg border border-[#d5dbe6] px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-[#092451]">
          Password
          <input name="password" type="password" autoComplete="current-password" required className="h-11 rounded-lg border border-[#d5dbe6] px-3" />
        </label>
        <button type="submit" className="h-11 rounded-lg bg-[#092451] text-sm font-semibold text-white">
          Sign in
        </button>
      </form>
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#092451]/10">
        <h2 className="text-sm font-semibold text-[#092451]">Demonstration accounts</h2>
        <ul className="mt-3 flex flex-col gap-3 text-sm text-[#3d4a5c]">
          {DEMO_LOGINS.map((login) => (
            <li key={login.email}>
              <p className="font-medium text-[#092451]">{login.displayName}</p>
              <p>{login.email}</p>
              <p>{login.password}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
