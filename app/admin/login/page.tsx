'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        { email, password },
      );
      if (authError) throw authError;

      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', data.user.id)
        .single();

      if (!adminData) {
        await supabase.auth.signOut();
        throw new Error('Access denied. This login is for admins only.');
      }

      router.push('/admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05070b] text-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-zinc-800 bg-[#0c1016]/90 shadow-[0_30px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div className="border-b border-zinc-800 bg-zinc-950/60 px-6 py-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#facc15] via-[#fbbf24] to-[#f59e0b] text-2xl font-black text-slate-950 shadow-[0_18px_40px_rgba(250,204,21,0.35)]">
            EE
          </div>

          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[#facc15]/80">
            Eagle Elites
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            Admin Portal
          </h1>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1.5 text-xs font-medium text-yellow-300">
            <span className="h-2 w-2 rounded-full bg-yellow-400" />
            Authorised Access Only
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 p-6">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-200"
            >
              Email
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                ✉️
              </span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-zinc-700/80 bg-zinc-800/80 py-3.5 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:border-yellow-400/70 focus:outline-none focus:ring-2 focus:ring-yellow-400/20"
                placeholder="admin@eagleelites.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-200"
            >
              Password
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                🔒
              </span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-zinc-700/80 bg-zinc-800/80 py-3.5 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:border-yellow-400/70 focus:outline-none focus:ring-2 focus:ring-yellow-400/20"
                placeholder="Admin password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#facc15] via-[#fbbf24] to-[#f59e0b] px-5 py-3.5 text-base font-semibold text-slate-950 shadow-[0_18px_35px_rgba(250,204,21,0.35)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_40px_rgba(250,204,21,0.42)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Verifying...' : 'Access Admin Panel →'}
          </button>
        </form>

        <div className="border-t border-zinc-800 bg-zinc-950/40 px-6 py-4 text-center text-xs text-zinc-400">
          Eagle Elites Transport © 2026 · Admin Access
        </div>
      </div>
    </div>
  );
}
