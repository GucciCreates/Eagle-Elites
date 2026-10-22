'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/auth/auth-shell';
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

  return <AuthShell panel="login" eyebrow="Driver" title="Driver log in" subtitle="View your assigned trips and record who boarded." footer={<>Admin? <Link href="/admin/login" className={linkClass}>Admin log in</Link></>}>
    {error && <Alert tone="error">{error}</Alert>}
    <form onSubmit={handleLogin} noValidate className="space-y-4">
      <Field id="email" label="Driver email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="driver@example.com" required />
      <Field id="password" label="Password" password autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" required labelAction={<Link href="/auth/reset-password" className={`text-xs ${linkClass}`}>Forgot password?</Link>} />
      <SubmitButton loading={loading} loadingText="Logging in…">Log in</SubmitButton>
    </form>
  </AuthShell>;
}
