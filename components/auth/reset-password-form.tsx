'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/auth/auth-shell';
import {
  Alert,
  Field,
  SubmitButton,
  linkClass,
} from '@/components/auth/form-ui';
import {
  PASSWORD_MIN_LENGTH,
  friendlyAuthError,
  normalizeEmail,
  validateConfirmPassword,
  validateEmail,
  validateNewPassword,
} from '@/lib/auth/form';
import { createClient } from '@/lib/supabase/client';

type Variant = 'student' | 'admin';

const COPY = {
  student: {
    path: '/auth/reset-password',
    loginPath: '/auth/login',
    loginLabel: 'Back to log in',
    eyebrow: 'Account help',
    requestTitle: 'Reset your password',
    requestSubtitle: "Enter your email and we'll send you a reset link.",
    setTitle: 'Set a new password',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
  },
  admin: {
    path: '/admin/reset-password',
    loginPath: '/admin/login',
    loginLabel: 'Back to admin log in',
    eyebrow: 'Admin',
    requestTitle: 'Reset admin password',
    requestSubtitle: "Enter your admin email and we'll send you a reset link.",
    setTitle: 'Set a new admin password',
    emailLabel: 'Admin email',
    emailPlaceholder: 'admin@example.com',
  },
} as const;

type Errors = { email?: string; password?: string; confirm?: string };

export default function ResetPasswordForm({ variant }: { variant: Variant }) {
  const copy = COPY[variant];
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [updated, setUpdated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const emailParam = params.get('email');
    const type = params.get('type') ?? hash.get('type');
    const tokenHash = params.get('token_hash') ?? hash.get('token_hash');
    const authCode = params.get('code');
    const linkError =
      params.get('error_description') ?? hash.get('error_description');

    /* eslint-disable react-hooks/set-state-in-effect */
    if (emailParam) setEmail(emailParam);
    if (type === 'recovery' || tokenHash || authCode) setRecoveryMode(true);
    if (linkError) {
      setError(
        friendlyAuthError(
          new Error(linkError),
          'This reset link is invalid or has expired. Please request a new one.',
        ),
      );
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');

    const emailError = validateEmail(email);
    setErrors({ email: emailError });
    if (emailError) return;

    const cleanEmail = normalizeEmail(email);
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        { redirectTo: `${window.location.origin}${copy.path}` },
      );
      if (resetError) throw resetError;
      setSentTo(cleanEmail);
    } catch (err) {
      setError(friendlyAuthError(err, 'Unable to send the reset email.'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || updated) return;
    setError('');

    const nextErrors: Errors = {
      password: validateNewPassword(newPassword),
      confirm: validateConfirmPassword(newPassword, confirmPassword),
    };
    setErrors(nextErrors);
    if (nextErrors.password || nextErrors.confirm) return;

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      setUpdated(true);
      setTimeout(() => router.push(copy.loginPath), 1500);
    } catch (err) {
      setError(friendlyAuthError(err, 'Unable to update your password.'));
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <Link href={copy.loginPath} className={linkClass}>
      {copy.loginLabel}
    </Link>
  );

  if (sentTo && !recoveryMode) {
    return (
      <AuthShell
        eyebrow={copy.eyebrow}
        title="Check your email"
        subtitle={
          <>
            If an account exists for{' '}
            <span className="font-medium text-white">{sentTo}</span>, a reset
            link is on its way. Open it on this device to choose a new password.
          </>
        }
        footer={footer}
      >
        <Alert tone="info">
          Didn&apos;t get it? Check your spam folder, or wait a minute and send
          it again.
        </Alert>
        <button
          type="button"
          onClick={() => setSentTo('')}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/40"
        >
          Send another link
        </button>
      </AuthShell>
    );
  }

  if (recoveryMode) {
    return (
      <AuthShell
        eyebrow={copy.eyebrow}
        title={copy.setTitle}
        subtitle="Choose a new password for your account."
        footer={footer}
      >
        {error && <Alert tone="error">{error}</Alert>}
        {updated && (
          <Alert tone="success">Password updated. Taking you to log in…</Alert>
        )}

        <form onSubmit={handleUpdatePassword} noValidate className="space-y-4">
          <Field
            id="new-password"
            label="New password"
            password
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={errors.password}
            hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
            placeholder="Create a new password"
            minLength={PASSWORD_MIN_LENGTH}
            required
          />
          <Field
            id="confirm-password"
            label="Confirm new password"
            password
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onBlur={() =>
              confirmPassword &&
              setErrors((prev) => ({
                ...prev,
                confirm: validateConfirmPassword(newPassword, confirmPassword),
              }))
            }
            error={errors.confirm}
            placeholder="Re-enter the new password"
            required
          />
          <SubmitButton
            loading={loading}
            loadingText="Updating…"
            disabled={updated}
          >
            Update password
          </SubmitButton>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow={copy.eyebrow}
      title={copy.requestTitle}
      subtitle={copy.requestSubtitle}
      footer={footer}
    >
      {error && <Alert tone="error">{error}</Alert>}

      <form onSubmit={handleRequestReset} noValidate className="space-y-4">
        <Field
          id="email"
          label={copy.emailLabel}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          placeholder={copy.emailPlaceholder}
          required
        />
        <SubmitButton loading={loading} loadingText="Sending link…">
          Send reset link
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
