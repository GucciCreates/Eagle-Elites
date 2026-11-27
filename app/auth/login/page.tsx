'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthShell from '@/components/auth/auth-shell';
import GoogleAuthOption from '@/components/auth/google-auth-option';
import {
  Alert,
  Field,
  SubmitButton,
  linkClass,
} from '@/components/auth/form-ui';
import { getPostLoginPath } from '@/lib/auth/post-login-path';
import {
  friendlyAuthError,
  normalizeEmail,
  validateEmail,
} from '@/lib/auth/form';
import { createClient } from '@/lib/supabase/client';

type Errors = { email?: string; password?: string };

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    const authCode = new URLSearchParams(window.location.search).get('auth');
    if (!authCode) return;
    const messages: Record<string, string> = {
      google_failed: 'Google sign in did not finish. Please try again or use your email and password.',
      setup_failed: 'Your sign in worked, but we could not finish setting up your student profile. Please try again.',
    };
    if (messages[authCode]) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(messages[authCode]);
    }
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  // The demo lives on its own public page and never touches the real session.
  const handleDemoLogin = () => router.push('/demo');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');

    const nextErrors: Errors = {
      email: validateEmail(email),
      password: password ? undefined : 'Enter your password.',
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;

    setLoading(true);
    let signedIn = false;
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email: normalizeEmail(email),
          password,
        },
      );

      if (authError) throw authError;
      signedIn = true;

      const { data: admin, error: adminError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle();
      if (adminError) throw adminError;
      if (admin) {
        router.push('/admin/dashboard');
        return;
      }

      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id')
        .eq('id', data.user.id)
        .eq('active', true)
        .maybeSingle();
      if (driverError) throw driverError;
      if (driver) {
        router.push('/driver/dashboard');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('status, role')
        .eq('id', data.user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile || profile.role !== 'student') {
        throw new Error('We could not find a student account for this login. Try the admin or driver sign-in, or contact support.');
      }

      router.push(getPostLoginPath(profile?.status));
    } catch (err) {
      if (signedIn) await supabase.auth.signOut();
      setError(friendlyAuthError(err, 'Login failed. Please try again.'));
      setLoading(false);
    }
  };

  const resetHref = `/auth/reset-password${
    email.trim() ? `?email=${encodeURIComponent(normalizeEmail(email))}` : ''
  }`;

  return (
    <AuthShell
      panel="login"
      eyebrow="Welcome back"
      title="Log in to your account"
      subtitle="Manage your route, seat and payments."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className={linkClass}>
            Sign up
          </Link>
          <span className="mx-2 text-zinc-600">·</span>
          <Link href="/driver/login" className={linkClass}>
            Driver
          </Link>
          <span className="mx-2 text-zinc-600">·</span>
          <Link href="/admin/login" className={linkClass}>
            Admin
          </Link>
        </>
      }
    >
      {error && <Alert tone="error">{error}</Alert>}

      <GoogleAuthOption portal="student" disabled={loading} />

      <form onSubmit={handleLogin} noValidate className="space-y-4">
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          placeholder="Your password"
          required
          labelAction={
            <Link href={resetHref} className={`text-xs ${linkClass}`}>
              Forgot password?
            </Link>
          }
        />

        <SubmitButton loading={loading} loadingText="Logging in…">
          Log in
        </SubmitButton>
      </form>

      <div className="my-5 flex items-center gap-3 text-zinc-500">
        <div className="h-px flex-1 bg-zinc-800" />
        <span className="text-[10px] uppercase tracking-[0.22em]">or</span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      <button
        type="button"
        onClick={handleDemoLogin}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/40"
      >
        Try the demo
      </button>
    </AuthShell>
  );
}
