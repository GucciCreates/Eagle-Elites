'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthShell from '@/components/auth/auth-shell';
import GoogleButton from '@/components/auth/google-button';
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
  const [googleLoading, setGoogleLoading] = useState(false);
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

  const handleGoogleLogin = async () => {
    if (googleLoading) return;
    setError('');
    setGoogleLoading(true);

    try {
      const { error: oAuthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/dashboard')}`,
        },
      });

      if (oAuthError) throw oAuthError;
    } catch (err) {
      setError(
        friendlyAuthError(err, 'Google sign in failed. Please try again.'),
      );
      setGoogleLoading(false);
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
      subtitle="Access your courses, assignments and academic updates in one place."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className={linkClass}>
            Sign up
          </Link>
        </>
      }
    >
      <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Student overview
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              96.4% attendance
            </p>
          </div>
          <div className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
            On track
          </div>
        </div>
      </div>

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
          placeholder="name@university.edu"
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
          placeholder="Enter your password"
          required
          labelAction={
            <Link href={resetHref} className={`text-xs ${linkClass}`}>
              Forgot password?
            </Link>
          }
        />

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Keep me signed in
        </label>

        <SubmitButton loading={loading} loadingText="Logging in…">
          Log in
        </SubmitButton>
      </form>

      <div className="my-5 flex items-center gap-3 text-slate-400">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-[10px] uppercase tracking-[0.22em]">or</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <GoogleButton
        label="Continue with Google"
        onClick={() => void handleGoogleLogin()}
        loading={googleLoading}
      />

      <button
        type="button"
        onClick={handleDemoLogin}
        className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
      >
        Try the demo
      </button>
    </AuthShell>
  );
}
