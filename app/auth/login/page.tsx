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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0a] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(234,179,8,0.12),_transparent_30%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-400 text-xl font-black text-black shadow-lg shadow-yellow-500/20">
              EE
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Eagle Elites
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Student Transport Portal
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="h-px flex-1 bg-zinc-800" />
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                Sign in to continue
              </span>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/90 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_26px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm">
            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm text-red-200">
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
                    className="w-full rounded-xl border border-zinc-700/80 bg-zinc-800/80 pl-10 pr-4 py-3.5 text-white placeholder-zinc-600 focus:border-yellow-400/70 focus:outline-none focus:ring-2 focus:ring-yellow-400/20 transition-all duration-200"
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
                    className="w-full rounded-xl border border-zinc-700/80 bg-zinc-800/80 pl-10 pr-4 py-3.5 text-white placeholder-zinc-600 focus:border-yellow-400/70 focus:outline-none focus:ring-2 focus:ring-yellow-400/20 transition-all duration-200"
                    placeholder="Your password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-3.5 font-semibold text-black transition-all duration-200 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-70"
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

            <div className="my-4 border-t border-zinc-800" />

            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 font-medium text-yellow-200 transition hover:bg-yellow-500/20"
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
  );
}
