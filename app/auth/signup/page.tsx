'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

type Errors = {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
};

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState('');

  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const validate = (): Errors => ({
    name: name.trim() ? undefined : 'Enter your full name.',
    email: validateEmail(email),
    password: validateNewPassword(password),
    confirm: validateConfirmPassword(password, confirm),
  });

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    const cleanEmail = normalizeEmail(email);
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/login`,
        },
      });

      if (authError) throw authError;

      // Supabase returns a user with no identities when the email is taken.
      if (authData.user && authData.user.identities?.length === 0) {
        throw new Error('User already registered');
      }

      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            id: authData.user.id,
            email: cleanEmail,
            full_name: name.trim(),
            role: 'student',
            status: 'incomplete',
          },
          { onConflict: 'id' },
        );

        // Without a session (email confirmation on) the profile can be
        // completed after the user confirms, so don't block on it.
        if (profileError && authData.session) throw profileError;
      }

      if (!authData.session) {
        setSentTo(cleanEmail);
        setLoading(false);
        return;
      }

      router.push('/onboarding/profile');
    } catch (err) {
      setError(friendlyAuthError(err, 'Sign up failed. Please try again.'));
      setLoading(false);
    }
  };

  if (sentTo) {
    return (
      <AuthShell
        eyebrow="Almost there"
        title="Check your email"
        subtitle={
          <>
            We sent a confirmation link to{' '}
            <span className="font-medium text-white">{sentTo}</span>. Open it to
            activate your account, then log in.
          </>
        }
      >
        <Alert tone="info">
          Can&apos;t find it? Check your spam folder, or wait a minute and try
          again.
        </Alert>
        <Link
          href="/auth/login"
          className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 px-4 py-3 font-semibold text-black transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
        >
          Go to log in
        </Link>
        <button
          type="button"
          onClick={() => setSentTo('')}
          className={`mt-4 w-full text-center text-sm ${linkClass}`}
        >
          Use a different email
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="New account"
      title="Create your account"
      subtitle="Book your seat and manage your daily commute."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/auth/login" className={linkClass}>
            Log in
          </Link>
        </>
      }
    >
      {error && <Alert tone="error">{error}</Alert>}

      <form onSubmit={handleSignUp} noValidate className="space-y-4">
        <Field
          id="name"
          label="Full name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          placeholder="Your full name"
          required
        />

        <Field
          id="email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() =>
            email &&
            setErrors((prev) => ({ ...prev, email: validateEmail(email) }))
          }
          error={errors.email}
          placeholder="you@example.com"
          required
        />

        <Field
          id="password"
          label="Password"
          password
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
          placeholder="Create a password"
          minLength={PASSWORD_MIN_LENGTH}
          required
        />

        <Field
          id="confirm-password"
          label="Confirm password"
          password
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onBlur={() =>
            confirm &&
            setErrors((prev) => ({
              ...prev,
              confirm: validateConfirmPassword(password, confirm),
            }))
          }
          error={errors.confirm}
          placeholder="Re-enter your password"
          required
        />

        <SubmitButton loading={loading} loadingText="Creating account…">
          Create account
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
