'use client';

import PasswordInput from '@/components/password-input';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const emailParam = params.get('email');
    const type = params.get('type') ?? hash.get('type');
    const tokenHash = params.get('token_hash') ?? hash.get('token_hash');
    const authCode = params.get('code');

    /* eslint-disable react-hooks/set-state-in-effect */
    if (emailParam) {
      setEmail(emailParam);
    }

    if (type === 'recovery' || tokenHash || authCode) {
      setRecoveryMode(true);
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Please enter your admin email address first.');
      return;
    }

    setRequesting(true);

    try {
      const redirectUrl = `${window.location.origin}/admin/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo: redirectUrl },
      );

      if (resetError) throw resetError;

      setSuccess(
        'A password reset link has been sent to your admin email. Open it to create a new password.',
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to send reset email.',
      );
    } finally {
      setRequesting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError('Please complete both password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setSuccess('Admin password updated successfully.');
      setTimeout(() => router.push('/admin/login'), 1500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to update password.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05070b] text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-zinc-800 bg-[#0c1016]/90 shadow-[0_30px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div className="border-b border-zinc-800 bg-zinc-950/60 px-6 py-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#facc15] via-[#fbbf24] to-[#f59e0b] text-2xl font-black text-slate-950 shadow-[0_18px_40px_rgba(250,204,21,0.35)]">
            EE
          </div>
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[#facc15]/80">
            Eagle Elites
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {recoveryMode ? 'Set a new admin password' : 'Reset admin password'}
          </h1>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-200">
              <span>✓</span>
              <span>{success}</span>
            </div>
          )}

          {recoveryMode ? (
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="new-password"
                  className="block text-sm font-medium text-zinc-200"
                >
                  New password
                </label>
                <PasswordInput
                  autoComplete="new-password"
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-zinc-700/80 bg-zinc-800/80 py-3.5 px-4 text-white placeholder:text-zinc-600 focus:border-yellow-400/70 focus:outline-none focus:ring-2 focus:ring-yellow-400/20"
                  placeholder="Enter a new password"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-medium text-zinc-200"
                >
                  Confirm password
                </label>
                <PasswordInput
                  autoComplete="new-password"
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-zinc-700/80 bg-zinc-800/80 py-3.5 px-4 text-white placeholder:text-zinc-600 focus:border-yellow-400/70 focus:outline-none focus:ring-2 focus:ring-yellow-400/20"
                  placeholder="Confirm password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#facc15] via-[#fbbf24] to-[#f59e0b] px-5 py-3.5 text-base font-semibold text-slate-950 shadow-[0_18px_35px_rgba(250,204,21,0.35)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_40px_rgba(250,204,21,0.42)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Updating password...' : 'Update password'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRequestReset} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-zinc-200"
                >
                  Admin email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-zinc-700/80 bg-zinc-800/80 py-3.5 px-4 text-white placeholder:text-zinc-600 focus:border-yellow-400/70 focus:outline-none focus:ring-2 focus:ring-yellow-400/20"
                  placeholder="admin@eagleelites.com"
                />
              </div>

              <button
                type="submit"
                disabled={requesting}
                className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#facc15] via-[#fbbf24] to-[#f59e0b] px-5 py-3.5 text-base font-semibold text-slate-950 shadow-[0_18px_35px_rgba(250,204,21,0.35)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_40px_rgba(250,204,21,0.42)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {requesting ? 'Sending link...' : 'Send reset link'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-zinc-400">
            <Link
              href="/admin/login"
              className="font-medium text-yellow-300 hover:text-yellow-200"
            >
              Back to admin login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
