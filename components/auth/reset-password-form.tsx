'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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

type Variant = 'student' | 'admin' | 'driver';

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
  driver: {
    path: '/driver/reset-password',
    loginPath: '/driver/login',
    loginLabel: 'Back to driver log in',
    eyebrow: 'Driver account help',
    requestTitle: 'Reset your driver password',
    requestSubtitle: "Enter your driver account email and we'll send a secure reset link.",
    setTitle: 'Set a new driver password',
    emailLabel: 'Driver email',
    emailPlaceholder: 'driver@example.com',
  },
} as const;

type Errors = { email?: string; password?: string; confirm?: string };

export default function ResetPasswordForm({ variant }: { variant: Variant }) {
  const copy = COPY[variant];
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
  const [checkingRecovery, setCheckingRecovery] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const emailParam = params.get('email');
    const type = params.get('type') ?? hash.get('type');
    const tokenHash = params.get('token_hash') ?? hash.get('token_hash');
    const authCode = params.get('code');
    const accessToken = hash.get('access_token');
    const linkError =
      params.get('error_description') ?? hash.get('error_description');
    const hasRecoveryCallback =
      type === 'recovery' || Boolean(tokenHash || authCode || accessToken);
    let active = true;

    /* eslint-disable react-hooks/set-state-in-effect */
    if (hasRecoveryCallback) setCheckingRecovery(true);
    if (emailParam) setEmail(emailParam);
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
      if (event === 'PASSWORD_RECOVERY' && active) {
        setRecoveryMode(true);
        setCheckingRecovery(false);
      }
    });

    if (hasRecoveryCallback && !linkError) {
      void (async () => {
        try {
          if (tokenHash && type === 'recovery') {
            const { error: verifyError } = await supabase.auth.verifyOtp({
              type: 'recovery',
              token_hash: tokenHash,
            });
            if (!active) return;
            if (verifyError) {
              setError(
                friendlyAuthError(
                  verifyError,
                  'This reset link is invalid or has expired. Please request a new one.',
                ),
              );
              return;
            }
            setRecoveryMode(true);
            return;
          }

          // The browser client exchanges PKCE codes and hash tokens on initialization.
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (!active) return;
          if (data.session && (authCode || accessToken || type === 'recovery')) {
            setRecoveryMode(true);
          } else {
            setError(
              friendlyAuthError(
                sessionError,
                'This reset link is invalid or has expired. Please request a new one.',
              ),
            );
          }
        } catch (verificationError) {
          if (!active) return;
          setError(
            friendlyAuthError(
              verificationError,
              'This reset link is invalid or has expired. Please request a new one.',
            ),
          );
        } finally {
          if (active) setCheckingRecovery(false);
        }
      })();
    } else if (linkError) {
      setCheckingRecovery(false);
    }

    return () => {
      active = false;
      subscription.unsubscribe();
    };
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

      await supabase.auth.signOut();
      setNewPassword('');
      setConfirmPassword('');
      setUpdated(true);
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
          For privacy, this page won&apos;t reveal whether an account exists for
          that address. Check your inbox and spam folder; delivery can take a
          few minutes.
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
    if (updated) {
      return (
        <AuthShell
          eyebrow={copy.eyebrow}
          title="Password updated"
          subtitle="Your new password is ready to use. Sign in with it to continue."
          footer={footer}
        >
          <Alert tone="success">Your password has been changed securely.</Alert>
          <Link
            href={copy.loginPath}
            className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 px-4 py-3 font-semibold text-black shadow-[0_12px_28px_rgba(250,204,21,0.28)] transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1119]"
          >
            Continue to log in
          </Link>
        </AuthShell>
      );
    }

    return (
      <AuthShell
        eyebrow={copy.eyebrow}
        title={copy.setTitle}
        subtitle="Choose a new password for your account."
        footer={footer}
      >
        {error && <Alert tone="error">{error}</Alert>}
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
          <PasswordGuidance password={newPassword} />
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

  if (checkingRecovery) {
    return (
      <AuthShell
        eyebrow={copy.eyebrow}
        title="Verifying your reset link"
        subtitle="Please wait while we securely verify this one-time link."
        footer={footer}
      >
        <div
          role="status"
          className="flex items-center justify-center gap-3 py-5 text-sm text-zinc-300"
        >
          <span
            aria-hidden="true"
            className="h-5 w-5 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent"
          />
          Checking link…
        </div>
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

function PasswordGuidance({ password }: { password: string }) {
  const checks = [
    password.length >= PASSWORD_MIN_LENGTH,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password) || /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const label = !password
    ? 'Add a password'
    : score === 3
      ? 'Strong'
      : score === 2
        ? 'Good'
        : 'Needs improvement';
  const barColor =
    score === 3
      ? 'bg-emerald-400'
      : score === 2
        ? 'bg-yellow-400'
        : 'bg-zinc-600';

  return (
    <div className="-mt-2" aria-live="polite">
      <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-400">
        <span>Password strength</span>
        <span>{label}</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
        {checks.map((check, index) => (
          <span
            key={index}
            className={`h-1 rounded-full ${check ? barColor : 'bg-zinc-700'}`}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Use at least {PASSWORD_MIN_LENGTH} characters, a mix of upper and
        lowercase letters, and a number or symbol.
      </p>
    </div>
  );
}
