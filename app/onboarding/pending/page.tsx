'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPostLoginPath } from '@/lib/auth/post-login-path';
import { createClient } from '@/lib/supabase/client';
import AuthShell from '@/components/auth/auth-shell';
import Stepper from '@/components/onboarding/stepper';
import { EXPECTED_REVIEW_HOURS, formatPkr } from '@/lib/onboarding/pricing';
import { findRejectionReason } from '@/lib/onboarding/rejection-reasons';

type Profile = {
  status: string;
  applied_at: string | null;
  rejected_reason: string | null;
  rejection_code: string | null;
  payment_reference: string | null;
  amount_due: number | null;
  waitlisted: boolean | null;
};

function parseDbTime(iso: string) {
  // DB timestamps without a zone are UTC.
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
}

function formatWhen(iso: string | null) {
  if (!iso) return '';
  // DB timestamps without a zone are UTC.
  const date = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
  return (
    date.toLocaleString('en-PK', {
      timeZone: 'Asia/Karachi',
      dateStyle: 'medium',
      timeStyle: 'short',
    }) + ' PKT'
  );
}

export default function OnboardingPending() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [overdue, setOverdue] = useState(false);

  useEffect(() => {
    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      if (!data) return;
      const next = getPostLoginPath(data.status);
      if (next !== '/onboarding/pending') {
        router.push(next);
        return;
      }
      setProfile(data as Profile);
      if (data.applied_at) {
        const hours =
          (Date.now() - parseDbTime(data.applied_at).getTime()) / 36e5;
        setOverdue(hours > EXPECTED_REVIEW_HOURS);
      }
    };
    void check();
    const interval = setInterval(() => void check(), 30000);
    return () => clearInterval(interval);
  }, [router, supabase]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (!profile) {
    return (
      <AuthShell
        wide
        title="Checking your application…"
        top={<Stepper current={5} />}
      >
        <div className="h-40 animate-pulse rounded-2xl bg-zinc-900" />
      </AuthShell>
    );
  }

  const secondary =
    'inline-flex flex-1 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:border-zinc-500';
  const primary =
    'inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 px-4 py-3 text-sm font-semibold text-black';

  if (profile.status === 'rejected') {
    const reason = findRejectionReason(profile.rejection_code);
    return (
      <AuthShell
        wide
        eyebrow="Application update"
        title="Your application needs a fix"
        subtitle="Nothing is lost. Update the details below and resubmit."
        top={<Stepper current={5} />}
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            <p className="font-semibold text-red-200">
              {reason?.label ?? 'Reason'}
            </p>
            <p className="mt-1">
              {profile.rejected_reason ||
                reason?.message ||
                'Please contact us for details.'}
            </p>
            {reason?.fix && (
              <p className="mt-2 text-red-100/80">What to do: {reason.fix}</p>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/onboarding/profile" className={primary}>
              Fix and resubmit →
            </Link>
            <a
              href="https://wa.me/923225166580?text=Hi%20Eagle%20Elites%2C%20my%20application%20needs%20a%20fix."
              target="_blank"
              rel="noreferrer"
              className={secondary}
            >
              💬 Ask on WhatsApp
            </a>
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300"
          >
            Log out
          </button>
        </div>
      </AuthShell>
    );
  }

  const appliedAt = profile.applied_at;
  const timeline = [
    {
      label: 'Application submitted',
      detail: formatWhen(appliedAt),
      state: 'done',
    },
    {
      label: 'Payment check',
      detail: `We match your transfer using reference ${profile.payment_reference ?? ''}`,
      state: 'active',
    },
    {
      label: 'Seat confirmed and account activated',
      detail: profile.waitlisted
        ? 'Your route is full. You’re on the waitlist.'
        : 'You’ll get a WhatsApp message',
      state: 'todo',
    },
  ];

  return (
    <AuthShell
      wide
      eyebrow="Under review"
      title="Application submitted 🎉"
      subtitle={`Most applications are reviewed within ${EXPECTED_REVIEW_HOURS} hours (Mon–Sat).`}
      top={<Stepper current={5} />}
    >
      <div className="space-y-6">
        <ol className="relative space-y-5 border-l border-zinc-800 pl-6">
          {timeline.map((step) => (
            <li key={step.label} className="relative">
              <span
                className={`absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 ${step.state === 'done' ? 'border-emerald-400 bg-emerald-400' : step.state === 'active' ? 'animate-pulse border-yellow-400 bg-yellow-400/30' : 'border-zinc-700 bg-zinc-900'}`}
              />
              <p
                className={`text-sm font-medium ${step.state === 'todo' ? 'text-zinc-400' : 'text-white'}`}
              >
                {step.label}
              </p>
              {step.detail && (
                <p className="mt-0.5 text-xs text-zinc-500">{step.detail}</p>
              )}
            </li>
          ))}
        </ol>

        {profile.waitlisted && (
          <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
            Your route is currently full, so you’re on the waitlist. We’ll
            confirm a seat or offer another route. Your payment is refundable if
            we can’t seat you.
          </p>
        )}
        {overdue && (
          <p className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
            Taking longer than usual? Message us on WhatsApp with your reference
            code and we’ll check right away.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Reference
            </p>
            <p className="font-mono text-white">{profile.payment_reference}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Paid
            </p>
            <p className="text-white">{formatPkr(profile.amount_due)}</p>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-500">
          This page refreshes automatically. You’ll be taken to your dashboard
          as soon as you’re approved.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href={`https://wa.me/923225166580?text=${encodeURIComponent(`Hi Eagle Elites, I submitted my application (ref ${profile.payment_reference ?? ''}).`)}`}
            target="_blank"
            rel="noreferrer"
            className={secondary}
          >
            💬 Follow up on WhatsApp
          </a>
          <button type="button" onClick={logout} className={secondary}>
            Log out
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
