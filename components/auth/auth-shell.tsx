import Link from 'next/link';
import type { ReactNode } from 'react';

type AuthShellProps = {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

/** Shared, minimal layout for every auth page. */
export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070b] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.12),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.10),_transparent_30%)]"
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-6 sm:py-10">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1.5 rounded-lg text-sm text-zinc-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/40"
        >
          <span aria-hidden="true">←</span> Back to home
        </Link>

        <main className="flex flex-1 flex-col justify-center py-8">
          <div className="mb-6 text-center">
            <Link
              href="/"
              aria-label="Eagle Elites home"
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#facc15] via-[#fbbf24] to-[#f59e0b] text-base font-black text-black shadow-[0_14px_32px_rgba(250,204,21,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/60"
            >
              EE
            </Link>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-yellow-300/80">
              {eyebrow ?? 'Eagle Elites'}
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-400">
                {subtitle}
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0c1119]/85 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-7">
            {children}
          </div>

          {footer && (
            <div className="mt-6 text-center text-sm text-zinc-400">
              {footer}
            </div>
          )}
        </main>

        <p className="text-center text-xs text-zinc-600">
          © 2026 Eagle Elites Transport
        </p>
      </div>
    </div>
  );
}
