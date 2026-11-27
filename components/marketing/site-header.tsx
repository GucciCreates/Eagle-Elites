'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Logo from '@/components/brand/logo';
import Icon from '@/components/ui/icons';
import { useSessionDestination } from '@/lib/auth/use-session-destination';
import { WHATSAPP_GENERAL } from '@/lib/brand';

const NAV = [
  ['Fares', '/#fares'],
  ['Your day', '/#your-day'],
  ['How it works', '/#how-it-works'],
  ['Parents', '/#parents'],
  ['FAQ', '/#faq'],
] as const;

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const session = useSessionDestination();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const close = () => setOpen(false);
  const signedIn = session.state === 'signed-in' ? session : null;

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        scrolled || open ? 'border-white/10 bg-[#070b10]/92 backdrop-blur-xl' : 'border-transparent bg-transparent'
      }`}
    >
      <nav aria-label="Main navigation" className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link href="/" onClick={close} className="rounded-xl">
          <Logo />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {NAV.map(([label, href]) => (
            <a key={href} href={href} className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/[0.05] hover:text-white">
              {label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <a href={WHATSAPP_GENERAL} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp" className="ee-btn ee-btn-ghost hidden h-11 w-11 px-0 text-[#25d366] md:inline-flex">
            <Icon name="whatsapp" size={22} />
          </a>
          {signedIn ? (
            <Link prefetch={false} href={signedIn.href} className="ee-btn ee-btn-primary hidden min-h-11 px-4 md:inline-flex">
              {signedIn.label} <Icon name="arrow-right" size={16} />
            </Link>
          ) : (
            <>
              <Link prefetch={false} href="/auth/login" className="ee-btn ee-btn-ghost hidden min-h-11 px-3 md:inline-flex">
                Log in
              </Link>
              <Link prefetch={false} href="/auth/signup" className="ee-btn ee-btn-primary hidden min-h-11 px-4 md:inline-flex">
                Reserve my seat
              </Link>
            </>
          )}
          <button
            ref={toggleRef}
            type="button"
            className="ee-btn ee-btn-secondary h-12 w-12 px-0 lg:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <Icon name="plus" size={22} className="rotate-45" />
            ) : (
              <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h10" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {open && (
        <div id="mobile-navigation" className="ee-enter border-t border-white/10 px-5 pb-5 pt-2 lg:hidden">
          <div className="grid">
            {NAV.map(([label, href]) => (
              <a key={href} href={href} onClick={close} className="flex min-h-12 items-center justify-between border-b border-white/[0.06] text-base text-zinc-200">
                {label}
                <Icon name="arrow-right" size={16} className="text-zinc-600" />
              </a>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {signedIn ? (
              <Link prefetch={false} href={signedIn.href} onClick={close} className="ee-btn ee-btn-primary col-span-2">
                {signedIn.label}
              </Link>
            ) : (
              <>
                <Link prefetch={false} href="/auth/login" onClick={close} className="ee-btn ee-btn-secondary">
                  Log in
                </Link>
                <Link prefetch={false} href="/auth/signup" onClick={close} className="ee-btn ee-btn-primary">
                  Reserve my seat
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
