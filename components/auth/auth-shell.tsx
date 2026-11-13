import Link from 'next/link';
import type { ReactNode } from 'react';

type PanelVariant = 'login' | 'signup' | 'admin';

const PANELS: Record<
  PanelVariant,
  { heading: string; text: string; points: string[] }
> = {
  login: {
    heading: 'Learn better. Stay on track.',
    text: 'Everything your students and faculty need in one calm, focused learning space.',
    points: [
      'Smart course dashboard and progress insights',
      'Assignments, timetables and grades in one place',
      'Faculty updates and announcements without clutter',
      'Designed for digital-first campus life',
    ],
  },
  signup: {
    heading: 'Your academic journey starts here.',
    text: 'Set up your student account and unlock your coursework, events and resources.',
    points: [
      'Personalized student dashboard',
      'Track attendance, work and outcomes',
      'Access course materials and updates quickly',
      'Built for every stage of the semester',
    ],
  },
  admin: {
    heading: 'A clearer campus operations view.',
    text: 'Monitor teaching, enrolment and academic performance in a single system.',
    points: [
      'Track learner progress and engagement',
      'Review staff and course performance',
      'Make better decisions with one source of truth',
    ],
  },
};

function SidePanel({ variant }: { variant: PanelVariant }) {
  const panel = PANELS[variant];
  return (
    <aside className="relative hidden overflow-hidden rounded-[30px] border border-slate-200 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-800 p-10 text-white lg:flex lg:flex-col lg:justify-between">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:26px_26px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
      />
      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-indigo-100/90">
          Economics Portal
        </p>
        <h2 className="mt-4 max-w-xs text-4xl font-black leading-tight tracking-tight text-white">
          {panel.heading}
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-6 text-indigo-100/80">
          {panel.text}
        </p>
      </div>
      <ul className="relative mt-10 space-y-3">
        {panel.points.map((point) => (
          <li
            key={point}
            className="flex items-start gap-3 text-sm text-indigo-50"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/15 text-[11px] text-white"
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
    <div className="relative min-h-screen overflow-hidden bg-[#f4f7fb] text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.08),_transparent_20%)]"
      />

      <div
        className={`relative mx-auto flex min-h-screen w-full flex-col px-4 py-6 sm:py-10 ${
          panel ? 'max-w-md lg:max-w-5xl' : wide ? 'max-w-2xl' : 'max-w-md'
        }`}
      >
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1.5 rounded-lg text-sm text-slate-500 transition hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
        >
          <span aria-hidden="true">←</span> Back to home
        </Link>

        <main
          className={`flex flex-1 flex-col justify-center py-8 ${
            panel
              ? 'lg:grid lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch lg:gap-8'
              : ''
          }`}
        >
          {panel && <SidePanel variant={panel} />}
          <div className="flex flex-col justify-center lg:py-6">
            {top}
            <div className="mb-6 text-center">
              <Link
                href="/"
                aria-label="Economics Portal home"
                className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-base font-black text-white shadow-[0_14px_30px_rgba(79,70,229,0.25)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              >
                EP
              </Link>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-indigo-600">
                {eyebrow ?? 'Economics Portal'}
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                {title}
              </h1>
              {subtitle && (
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600">
                  {subtitle}
                </p>
              )}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-7">
              {children}
            </div>

            {footer && (
              <div className="mt-6 text-center text-sm text-slate-500">
                {footer}
              </div>
            )}
          </div>
        </main>

        <p className="text-center text-xs text-slate-500">
          © 2026 Economics Portal
        </p>
      </div>
    </div>
  );
}
