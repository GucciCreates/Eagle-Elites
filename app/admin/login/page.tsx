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
  friendlyAuthError,
  normalizeEmail,
  validateEmail,
} from '@/lib/auth/form';
import { createClient } from '@/lib/supabase/client';

type Errors = { email?: string; password?: string };

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [supabase] = useState(() => createClient());

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
      setError(friendlyAuthError(err, 'Login failed. Please try again.'));
      setLoading(false);
    }
  };

  const resetHref = `/admin/reset-password${
    email.trim() ? `?email=${encodeURIComponent(normalizeEmail(email))}` : ''
  }`;

  return (
    <AuthShell
      panel="admin"
      eyebrow="Admin"
      title="Admin log in"
      subtitle="For Eagle Elites staff only."
      footer={
        <>
          Not an admin?{' '}
          <Link href="/auth/login" className={linkClass}>
            Student log in
          </Link>
        </>
      }
    >
      {error && <Alert tone="error">{error}</Alert>}

      <form onSubmit={handleLogin} noValidate className="space-y-4">
        <Field
          id="email"
          label="Admin email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          placeholder="admin@example.com"
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
          placeholder="Admin password"
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
    </AuthShell>
  );
}
