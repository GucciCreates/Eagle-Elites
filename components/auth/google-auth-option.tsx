'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { friendlyAuthError } from '@/lib/auth/form';
import GoogleButton from '@/components/auth/google-button';
import { Alert } from '@/components/auth/form-ui';

export type AuthPortal = 'student' | 'admin' | 'driver';

export default function GoogleAuthOption({
  portal,
  disabled = false,
}: {
  portal: AuthPortal;
  disabled?: boolean;
}) {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const start = async () => {
    if (loading || disabled) return;
    setLoading(true);
    setError('');

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?portal=${portal}`,
          queryParams: { prompt: 'select_account' },
        },
      });

      if (oauthError) throw oauthError;
    } catch (reason) {
      setError(
        friendlyAuthError(
          reason,
          'Google sign in is unavailable right now. Please use your email and password.',
        ),
      );
      setLoading(false);
    }
  };

  return (
    <div className="mb-5">
      <GoogleButton onClick={() => void start()} loading={loading} disabled={disabled} />
      {error && <div className="mt-3"><Alert tone="error">{error}</Alert></div>}
      <div className="mt-5 flex items-center gap-3 text-zinc-500">
        <span className="h-px flex-1 bg-zinc-800" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">or use email</span>
        <span className="h-px flex-1 bg-zinc-800" />
      </div>
    </div>
  );
}
