import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page not found',
  description: 'The page you’re looking for could not be found.',
};

export default function NotFound() {
  return (
    <main className="flex min-h-[75vh] flex-1 items-center justify-center bg-[#070b10] px-5 py-16 text-white">
      <section className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#0d131c] p-7 text-center shadow-2xl shadow-black/30 sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-yellow-300/20 bg-yellow-300/10 text-lg font-bold text-yellow-200">
          404
        </span>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-yellow-200/80">
          Page not found
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          This page isn’t here
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-zinc-400">
          The link may be outdated, or the address may have been entered incorrectly.
          Head back to Eagle Elites and continue from there.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-yellow-300"
          >
            Go to home
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-white/30 hover:bg-white/[0.04]"
          >
            Student login
          </Link>
        </div>
      </section>
    </main>
  );
}
