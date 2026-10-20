import Link from 'next/link';
import type { ReactNode } from 'react';

type PanelVariant = 'login' | 'signup' | 'admin';

const PANELS: Record<
  PanelVariant,
  { heading: string; text: string; points: string[] }
> = {
  login: {
    heading: 'Your commute, smarter.',
    text: 'Everything for your daily ride in one place.',
    points: [
      'Daily routes to 15+ institutions',
      'AC coasters, Hiaces and vans',
      'One simple monthly plan',
      'Live GPS tracking and 24/7 WhatsApp support',
    ],
  },
  signup: {
    heading: 'Your seat is a few steps away.',
    text: 'Create an account, pick your route and you’re set.',
    points: [
      'Routes across Islamabad, Rawalpindi and Wah',
      'Multiple arrival and departure timings',
      'Monthly fee, no hidden charges',
      'Free annual trip for registered passengers',
    ],
  },
  admin: {
    heading: 'Eagle Elites admin.',
    text: 'Manage students, routes and payments.',
    points: [
      'Review applications and payments',
      'Manage routes, departures and pricing',
      'Restricted to authorised staff',
    ],
  },
};

function SidePanel({ variant }: { variant: PanelVariant }) {
  const panel = PANELS[variant];
  return (
    <aside className="relative hidden overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(250,204,21,0.18),_transparent_45%),linear-gradient(160deg,_#111827,_#0a0d14)] p-10 lg:flex lg:flex-col lg:justify-between">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
      />
      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-yellow-300/80">
          Eagle Elites
        </p>
        <h2 className="mt-4 max-w-xs text-4xl font-black leading-tight tracking-tight text-white">
          {panel.heading}
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-400">
          {panel.text}
        </p>
      </div>
      <ul className="relative mt-10 space-y-3">
        {panel.points.map((point) => (
          <li
            key={point}
            className="flex items-start gap-3 text-sm text-zinc-200"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-yellow-400/15 text-[11px] text-yellow-300"
            >
              ✓
            </span>
            {point}
          </li>
        ))}
      </ul>
    </aside>
  );
}

type AuthShellProps = {
  panel?: PanelVariant;
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Wider single column for multi-field forms (onboarding). */
  wide?: boolean;
  /** Rendered above the title, e.g. a progress stepper. */
  top?: ReactNode;
};

/** Shared, minimal layout for every auth page. */
export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  panel,
  wide,
  top,
}: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070b] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.12),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.10),_transparent_30%)]"
      />

      <div
        className={`relative mx-auto flex min-h-screen w-full flex-col px-4 py-6 sm:py-10 ${
          panel ? 'max-w-md lg:max-w-5xl' : wide ? 'max-w-2xl' : 'max-w-md'
        }`}
      >
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1.5 rounded-lg text-sm text-zinc-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/40"
        >
          <span aria-hidden="true">←</span> Back to home
        </Link>

        <main
          className={`flex flex-1 flex-col justify-center py-8 ${
            panel ? 'lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-8' : ''
          }`}
        >
          {panel && <SidePanel variant={panel} />}
          <div className="flex flex-col justify-center lg:py-6">
            {top}
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
          </div>
        </main>

        <p className="text-center text-xs text-zinc-600">
          © 2026 Eagle Elites Transport
        </p>
      </div>
    </div>
  );
}
