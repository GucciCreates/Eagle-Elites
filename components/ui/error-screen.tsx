'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import Icon from '@/components/ui/icons';
import { WHATSAPP_GENERAL } from '@/lib/brand';

/**
 * Friendly fallback for unexpected errors. Logs only the error's name and
 * server digest (an opaque ID that matches the server log), never its message
 * or data, so nothing personal ends up in the browser console.
 */
export default function ErrorScreen({
  error,
  retry,
  area = 'page',
  backHref = '/',
  backLabel = 'Go to home',
}: {
  error: unknown;
  retry: () => void;
  area?: string;
  backHref?: string;
  backLabel?: string;
}) {
  const digest =
    typeof error === 'object' && error && 'digest' in error ? String((error as { digest?: unknown }).digest ?? '') : '';

  useEffect(() => {
    const name = error instanceof Error ? error.name : typeof error;
    console.error(`[eagle-elites] ${area} error`, { name, digest: digest || undefined });
  }, [area, digest, error]);

  return (
    <main role="alert" className="flex min-h-[75vh] flex-1 items-center justify-center bg-[#06080c] px-5 py-16 text-white">
      <section className="ee-enter w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#0d1219] p-7 text-center shadow-2xl shadow-black/30 sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-200">
          <Icon name="lifebuoy" size={26} />
        </span>
        <p className="ee-eyebrow mt-6">Something went wrong</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">We couldn’t load this {area}</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-zinc-400">
          This is usually temporary, like a weak connection or a busy server. Try again, and if it keeps happening, message us on WhatsApp.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={() => retry()} className="ee-btn ee-btn-primary min-h-12">
            Try again
          </button>
          <Link href={backHref} className="ee-btn ee-btn-secondary min-h-12">
            {backLabel}
          </Link>
        </div>
        <a href={WHATSAPP_GENERAL} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block text-sm font-semibold text-yellow-200 underline-offset-4 hover:underline">
          Contact support on WhatsApp
        </a>
        {digest && <p className="mt-4 text-xs text-zinc-600">Reference: {digest}</p>}
      </section>
    </main>
  );
}
