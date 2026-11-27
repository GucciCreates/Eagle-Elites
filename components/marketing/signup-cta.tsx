'use client';

import Link from 'next/link';
import { useState } from 'react';
import GoogleButton from '@/components/auth/google-button';
import Icon from '@/components/ui/icons';
import { friendlyAuthError } from '@/lib/auth/form';
import { startGoogleSignIn } from '@/lib/auth/google';
import { useSessionDestination } from '@/lib/auth/use-session-destination';
import { loadSupabaseClient } from '@/lib/supabase/lazy-client';

/**
 * Primary conversion block: Google sign-up (one tap), email sign-up, and a
 * dashboard shortcut for visitors who are already signed in.
 */
export default function SignupCta({
  align = 'start',
}: {
  align?: 'start' | 'center';
}) {
  const session = useSessionDestination();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const google = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await startGoogleSignIn(await loadSupabaseClient(), 'student');
    } catch (reason) {
      setError(
        friendlyAuthError(
          reason,
          'Google sign in is unavailable right now. Please sign up with your email.',
        ),
      );
      setLoading(false);
    }
  };

  const wrap = `flex w-full max-w-md flex-col gap-3 ${align === 'center' ? 'mx-auto' : ''}`;

  if (session.state === 'signed-in') {
    return (
      <div className={wrap}>
        <Link
          prefetch={false}
          href={session.href}
          className="ee-btn ee-btn-primary ee-btn-lg"
        >
          {session.label} <Icon name="arrow-right" size={18} />
        </Link>
        <p className={`text-xs text-zinc-400 ${align === 'center' ? 'text-center' : ''}`}>
          You’re signed in. Pick up right where you left off.
        </p>
      </div>
    );
  }

  return (
    <div className={wrap}>
      <GoogleButton
        variant="light"
        onClick={() => void google()}
        loading={loading}
        label="Sign up with Google"
      />
      <Link
        prefetch={false}
        href="/auth/signup"
        className="ee-btn ee-btn-primary ee-btn-lg"
      >
        Reserve with email <Icon name="arrow-right" size={18} />
      </Link>
      {error && (
        <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      )}
      <p className={`text-xs leading-5 text-zinc-400 ${align === 'center' ? 'text-center' : ''}`}>
        Already riding with us?{' '}
        <Link prefetch={false} href="/auth/login" className="font-semibold text-yellow-200 underline-offset-4 hover:underline">
          Log in
        </Link>
        . Applying doesn’t confirm a seat: it’s confirmed once your payment is verified.
      </p>
    </div>
  );
}
