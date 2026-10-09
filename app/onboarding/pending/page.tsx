'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type ProfileStatus =
  | 'incomplete'
  | 'payment_pending'
  | 'pending'
  | 'active'
  | 'rejected'
  | string;

type Profile = {
  status: ProfileStatus;
  rejected_reason?: string | null;
};

export default function OnboardingPending() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkStatus = async () => {
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
        .single();

      if (data) {
        setProfile(data as Profile);

        if (data.status === 'active') {
          router.push('/dashboard');
          return;
        }

        if (data.status === 'incomplete' || data.status === 'payment_pending') {
          router.push('/onboarding/profile');
          return;
        }
      }

      setLoading(false);
    };

    void checkStatus();

    const interval = setInterval(() => {
      void checkStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05070b] px-4 text-white">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#facc15] via-[#fbbf24] to-[#f59e0b] text-xl font-black text-slate-950">
            EE
          </div>
          <p className="text-lg font-medium text-zinc-200">
            Checking your application status...
          </p>
        </div>
      </div>
    );
  }

  const isRejected = profile?.status === 'rejected';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070b] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.12),_transparent_28%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-10">
        <div className="w-full overflow-hidden rounded-[30px] border border-white/10 bg-[#0b1018]/80 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="border-b border-white/10 bg-white/3 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 text-lg font-black text-black shadow-[0_18px_40px_rgba(250,204,21,0.45)]">
              EE
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            {isRejected ? (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-4xl">
                  ❌
                </div>

                <div>
                  <h1 className="text-3xl font-black text-white">
                    Application Rejected
                  </h1>
                  <p className="mt-3 text-zinc-300">
                    Unfortunately your application was not approved. Please
                    contact Eagle Elites for more information.
                  </p>
                </div>

                {profile?.rejected_reason && (
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-left text-sm text-red-100">
                    <p className="mb-1 font-semibold text-red-200">
                      Reason given:
                    </p>
                    <p>{profile.rejected_reason}</p>
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Link
                    href="https://wa.me/923225166580?text=Hi%20Eagle%20Elites%2C%20my%20application%20was%20rejected."
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:border-zinc-500"
                  >
                    💬 Contact on WhatsApp
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-2xl bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 px-5 py-3 text-sm font-semibold text-black shadow-[0_14px_30px_rgba(250,204,21,0.35)] transition hover:translate-y-[-1px]"
                  >
                    Log Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-7 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/10 text-4xl">
                  ⏳
                </div>

                <div>
                  <h1 className="text-3xl font-black text-white">
                    Application Submitted!
                  </h1>
                  <p className="mt-3 text-zinc-300">
                    Your application and payment proof are under review. Admin
                    will verify and activate your account.
                  </p>
                </div>

                <div className="grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    { icon: '✅', label: 'Account created', done: true },
                    { icon: '✅', label: 'Profile completed', done: true },
                    {
                      icon: '✅',
                      label: 'Payment proof submitted',
                      done: true,
                    },
                    { icon: '⏳', label: 'Admin verification', done: false },
                    { icon: '🔒', label: 'Account activation', done: false },
                  ].map((step) => (
                    <div
                      key={step.label}
                      className={`rounded-2xl border p-3 ${
                        step.done
                          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                          : 'border-zinc-700 bg-zinc-900/80 text-zinc-300'
                      }`}
                    >
                      <div className="mb-2 text-xl">{step.icon}</div>
                      <p className="text-sm font-medium">{step.label}</p>
                    </div>
                  ))}
                </div>

                <p className="text-sm text-zinc-400">
                  This page checks automatically every 30 seconds. You will be
                  redirected as soon as your account is activated.
                </p>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Link
                    href="https://wa.me/923225166580?text=Hi%20Eagle%20Elites%2C%20I%20have%20submitted%20my%20application."
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:border-zinc-500"
                  >
                    💬 Follow up on WhatsApp
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-2xl bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 px-5 py-3 text-sm font-semibold text-black shadow-[0_14px_30px_rgba(250,204,21,0.35)] transition hover:translate-y-[-1px]"
                  >
                    Log Out
                  </button>
                </div>
              </div>
            )}

            <div className="mt-8 text-center text-xs text-zinc-600">
              Eagle Elites Transport © 2026 · All rights reserved
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
