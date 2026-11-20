'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/auth/auth-shell';
import GoogleAuthOption from '@/components/auth/google-auth-option';
import { Alert, Field, SubmitButton, linkClass } from '@/components/auth/form-ui';
import { friendlyAuthError, normalizeEmail, validateEmail } from '@/lib/auth/form';
import { createClient } from '@/lib/supabase/client';

export default function DriverLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    const authCode = new URLSearchParams(window.location.search).get('auth');
    if (!authCode) return;
    if (authCode === 'driver_only') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('This Google account is not linked to an active driver account. Ask an administrator to invite you.');
    } else if (authCode === 'google_failed') {
      setError('Google sign in did not finish. Please try again or use your email and password.');
    }
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    if (validateEmail(email) || !password) {
      setError(validateEmail(email) ?? 'Enter your password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password });
      if (authError) throw authError;
      const { data: driver, error: driverError } = await supabase.from('drivers').select('id').eq('id', data.user.id).eq('active', true).maybeSingle();
      if (driverError || !driver) {
        await supabase.auth.signOut();
        throw new Error('This login is not active as a driver account. Contact the transport administrator.');
      }
      router.push('/driver/dashboard');
    } catch (reason) {
      setError(friendlyAuthError(reason, 'Login failed. Please try again.'));
      setLoading(false);
    }
  };

  return <AuthShell panel="driver" eyebrow="Driver access" title="Driver log in" subtitle="View your assigned trips and record who boarded." footer={<><Link href="/auth/login" className={linkClass}>Student</Link><span className="mx-2 text-zinc-600">·</span><Link href="/admin/login" className={linkClass}>Admin</Link></>}>
    {error && <Alert tone="error">{error}</Alert>}
    <GoogleAuthOption portal="driver" disabled={loading} />
    <form onSubmit={handleLogin} noValidate className="space-y-4">
      <Field id="email" label="Driver email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="driver@example.com" required />
      <Field id="password" label="Password" password autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" required labelAction={<Link href={`/driver/reset-password${email.trim() ? `?email=${encodeURIComponent(normalizeEmail(email))}` : ''}`} className={`text-xs ${linkClass}`}>Forgot password?</Link>} />
      <SubmitButton loading={loading} loadingText="Logging in…">Log in</SubmitButton>
    </form>
  </AuthShell>;
}
