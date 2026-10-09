'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleDemoLogin = () => {
    const demoSession = {
      user: {
        id: 'demo-user',
        email: 'demo@student.eagleelites.com',
      },
      profile: {
        full_name: 'Demo Student',
        email: 'demo@student.eagleelites.com',
        role: 'student',
      },
    };

    localStorage.setItem('ee_demo_session', JSON.stringify(demoSession));
    router.push('/dashboard');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', data.user.id)
        .single();

      if (!profile || profile.status === 'incomplete') {
        router.push('/onboarding/profile');
      } else if (profile.status === 'payment_pending') {
        router.push('/onboarding/payment');
      } else if (
        profile.status === 'pending' ||
        profile.status === 'rejected'
      ) {
        router.push('/onboarding/pending');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070b] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.12),_transparent_30%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[30px] border border-white/10 bg-[#0b1018]/80 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative hidden overflow-hidden border-r border-white/10 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.24),_transparent_28%),linear-gradient(135deg,_rgba(17,24,39,0.95),_rgba(10,13,20,0.98))] p-8 lg:flex lg:flex-col lg:justify-between">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:28px_28px]" />
            <div className="relative">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 text-xl font-black text-black shadow-[0_18px_40px_rgba(250,204,21,0.45)]">
                EE
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-yellow-300/80">
                Eagle Elites
              </p>
              <h1 className="mt-5 max-w-xs text-4xl font-black leading-tight text-white">
                Your commute, smarter and stress-free.
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-zinc-300">
                Manage your route, track seat updates, and stay ahead of every
                pickup with a cleaner student transport experience.
              </p>
            </div>

            <div className="relative grid gap-3 text-sm text-zinc-200">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                  Live status
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-medium text-white">Next departure</span>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300">
                    On time
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full p-6 sm:p-8 lg:p-10">
            <div className="mb-8 text-center lg:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-yellow-300/80">
                Welcome back
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
                Sign in
              </h2>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0f1724]/80 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.28)] sm:p-6">
              {error && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm text-red-200">
                  <span className="text-base">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-zinc-300"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                      ✉️
                    </span>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-zinc-700/80 bg-zinc-900/80 pl-10 pr-4 py-3.5 text-white placeholder-zinc-500 focus:border-yellow-400/80 focus:outline-none focus:ring-2 focus:ring-yellow-400/20"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-zinc-300"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                      🔒
                    </span>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-zinc-700/80 bg-zinc-900/80 pl-10 pr-4 py-3.5 text-white placeholder-zinc-500 focus:border-yellow-400/80 focus:outline-none focus:ring-2 focus:ring-yellow-400/20"
                      placeholder="Your password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 px-4 py-3.5 font-semibold text-black shadow-[0_14px_30px_rgba(250,204,21,0.35)] hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Log In</span>
                      <span aria-hidden="true">→</span>
                    </>
                  )}
                </button>
              </form>

              <div className="my-5 flex items-center gap-3 text-zinc-500">
                <div className="h-px flex-1 bg-zinc-700" />
                <span className="text-[10px] uppercase tracking-[0.22em]">
                  or
                </span>
                <div className="h-px flex-1 bg-zinc-700" />
              </div>

              <button
                type="button"
                onClick={handleDemoLogin}
                className="w-full rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 font-medium text-yellow-200 transition hover:bg-yellow-500/15"
              >
                Use Demo Login
              </button>

              <p className="mt-6 text-center text-sm text-zinc-400">
                Don&apos;t have an account?{' '}
                <Link
                  href="/auth/signup"
                  className="font-medium text-yellow-400 transition hover:text-yellow-300"
                >
                  Sign up
                </Link>
              </p>
            </div>

            <div className="mt-6 text-center text-xs text-zinc-600">
              Eagle Elites Transport © 2026 · All rights reserved
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
