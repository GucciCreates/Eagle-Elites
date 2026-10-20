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
    if (loading) return;
    setError('');

    const nextErrors: Errors = {
      email: validateEmail(email),
      password: password ? undefined : 'Enter your password.',
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;

    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email: normalizeEmail(email),
          password,
        },
      );

      if (authError) throw authError;

      const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', data.user.id)
        .single();

      router.push(getPostLoginPath(profile?.status));
    } catch (err) {
      setError(friendlyAuthError(err, 'Login failed. Please try again.'));
      setLoading(false);
    }
  };

  const resetHref = `/auth/reset-password${
    email.trim() ? `?email=${encodeURIComponent(normalizeEmail(email))}` : ''
  }`;

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Log in to your account"
      subtitle="Manage your route, seat and payments."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className={linkClass}>
            Sign up
          </Link>
        </>
      }
    >
      {error && <Alert tone="error">{error}</Alert>}

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
