import Link from 'next/link';
import type { ReactNode } from 'react';
import Logo from '@/components/brand/logo';
import Icon from '@/components/ui/icons';
import { BRAND } from '@/lib/brand';

type PanelVariant = 'login' | 'signup' | 'admin' | 'driver';

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
  driver: {
    heading: 'Every trip, ready to roll.',
    text: 'Your assigned vehicle, route and passenger list in one place.',
    points: [
      'See only trips assigned to you',
      'Mark boarding as it happens',
      'Keep dispatch and students in sync',
    ],
  },
};

function RouteGraphic() {
  return (
    <div aria-hidden="true" className="relative my-10 h-36">
      <svg viewBox="0 0 320 120" className="h-full w-full" fill="none">
        <path
          id="ee-auth-route"
          d="M14 96 C 80 96, 90 30, 160 40 S 250 100, 306 24"
          stroke="rgba(232,187,64,0.35)"
          strokeWidth="2"
          strokeDasharray="6 8"
        />
        <circle cx="14" cy="96" r="6" fill="#0d1219" stroke="#e8bb40" strokeWidth="2" />
        <circle cx="160" cy="40" r="4" fill="#e8bb40" opacity=".6" />
        <circle cx="306" cy="24" r="7" fill="#e8bb40" />
        <circle r="5" fill="#fff4cf" className="ee-motion-only">
          <animateMotion dur="7s" repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.55 1">
            <mpath href="#ee-auth-route" />
          </animateMotion>
        </circle>
      </svg>
      <span className="absolute bottom-0 left-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Your stop</span>
      <span className="absolute right-0 top-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-yellow-200/80">Campus</span>
    </div>
  );
}

function SidePanel({ variant }: { variant: PanelVariant }) {
  const panel = PANELS[variant];
  return (
    <aside className="ee-enter relative hidden overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_15%_5%,_rgba(232,187,64,0.2),_transparent_40%),linear-gradient(155deg,_#141a23,_#080a0f_72%)] p-10 shadow-[0_32px_90px_rgba(0,0,0,0.35)] lg:flex lg:flex-col">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:30px_30px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
      />
      <div aria-hidden="true" className="ee-glow absolute -right-20 -top-20 h-64 w-64 rounded-full bg-yellow-400/10 blur-3xl" />
      <div className="relative">
        <Logo size={40} />
        <h2 className="mt-10 max-w-sm text-4xl font-black leading-[1.08] tracking-tight text-white xl:text-5xl">
          {panel.heading}
        </h2>
        <p className="mt-4 max-w-sm text-[15px] leading-7 text-zinc-300">
          {panel.text}
        </p>
      </div>
      <RouteGraphic />
      <ul className="ee-stagger relative mt-auto space-y-3">
        {panel.points.map((point) => (
          <li
            key={point}
            className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3.5 py-2.5 text-sm text-zinc-200"
          >
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-yellow-400/15 text-yellow-300">
              <Icon name="check" size={14} />
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
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(232,187,64,0.12),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.10),_transparent_30%)]"
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
          panel ? 'lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch lg:gap-10' : ''
          }`}
        >
          {panel && <SidePanel variant={panel} />}
          <div className="ee-enter mx-auto flex w-full max-w-md flex-col justify-center lg:py-6">
            {top}
            <div className="mb-6 text-center">
              <Link
                href="/"
                aria-label="Eagle Elites home"
                className="mx-auto mb-4 flex w-fit rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/60"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- SVG brand file */}
                <img
                  src={BRAND.logoSrc}
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-2xl shadow-[0_14px_32px_rgba(232,187,64,0.22)]"
                />
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

            <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(19,24,32,0.9),rgba(11,14,19,0.92))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-white/[0.03] backdrop-blur-xl sm:p-7">
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
          © {BRAND.legalName}
        </p>
      </div>
    </div>
  );
}
