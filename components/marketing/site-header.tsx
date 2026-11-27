'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Logo from '@/components/brand/logo';
import { useSessionDestination } from '@/lib/auth/use-session-destination';

const NAV = [
  ['Fares', '#fares'],
  ['Coverage', '#coverage'],
  ['How it works', '#how-it-works'],
  ['Safety', '#safety'],
  ['FAQ', '#faq'],
  ['Contact', '#contact'],
] as const;

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const session = useSessionDestination();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const close = () => setOpen(false);
  const signedIn = session.state === 'signed-in' ? session : null;

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors ${
        scrolled || open
          ? 'border-white/10 bg-[#070b10]/90 backdrop-blur-xl'
          : 'border-transparent bg-transparent'
      }`}
    >
      <nav
        aria-label="Main navigation"
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8"
      >
        <a href="#home" onClick={close} className="rounded-xl" aria-label="Eagle Elites home">
          <Logo />
        </a>

        <div className="hidden items-center gap-1 lg:flex">
          {NAV.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/[0.04] hover:text-white"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {signedIn ? (
            <Link
              href={signedIn.href}
              className="ee-btn ee-btn-primary min-h-10 px-4 py-2"
            >
              {signedIn.label} →
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="rounded-xl px-3 py-2 text-sm font-medium text-zinc-300 transition hover:text-white"
              >
                Log in
              </Link>
              <Link
                href="/auth/signup"
                className="ee-btn ee-btn-primary min-h-10 px-4 py-2"
              >
                Book my seat
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 text-xl md:hidden"
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen((v) => !v)}
        >
          <span aria-hidden="true">{open ? '×' : '☰'}</span>
        </button>
      </nav>

      {open && (
        <div id="mobile-navigation" className="border-t border-white/10 px-5 pb-5 pt-3 md:hidden">
          <div className="grid gap-1">
            {NAV.map(([label, href]) => (
              <a
                key={href}
                href={href}
                onClick={close}
                className="rounded-xl px-3 py-3 text-sm text-zinc-200 hover:bg-white/5"
              >
                {label}
              </a>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
            {signedIn ? (
              <Link
                href={signedIn.href}
                onClick={close}
                className="col-span-2 rounded-xl bg-yellow-400 px-3 py-3 text-center text-sm font-bold text-slate-950"
              >
                {signedIn.label}
              </Link>
            ) : (
              <>
                <Link href="/auth/login" onClick={close} className="rounded-xl border border-white/15 px-3 py-3 text-center text-sm font-medium">
                  Log in
                </Link>
                <Link href="/auth/signup" onClick={close} className="rounded-xl bg-yellow-400 px-3 py-3 text-center text-sm font-bold text-slate-950">
                  Book my seat
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
