'use client';

import { useEffect, useState } from 'react';
import { getPostLoginPath } from '@/lib/auth/post-login-path';
import { hasSessionCookie, loadSupabaseClient } from '@/lib/supabase/lazy-client';

export type SessionDestination =
  | { state: 'loading' }
  | { state: 'signed-out' }
  | { state: 'signed-in'; href: string; label: string };

async function resolveDestination(): Promise<SessionDestination> {
  // No session cookie means nobody is signed in: skip downloading the SDK.
  if (!hasSessionCookie()) return { state: 'signed-out' };
  try {
    const supabase = await loadSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { state: 'signed-out' };
    const id = session.user.id;
    const [{ data: admin }, { data: driver }, { data: profile }] = await Promise.all([
      supabase.from('admin_users').select('id').eq('id', id).maybeSingle(),
      supabase.from('drivers').select('id').eq('id', id).eq('active', true).maybeSingle(),
      supabase.from('profiles').select('status').eq('id', id).maybeSingle(),
    ]);
    if (admin) return { state: 'signed-in', href: '/admin/dashboard', label: 'Open admin dashboard' };
    if (driver) return { state: 'signed-in', href: '/driver/dashboard', label: 'Open driver dashboard' };
    const href = getPostLoginPath(profile?.status);
    return {
      state: 'signed-in',
      href,
      label: href === '/dashboard' ? 'Open my dashboard' : 'Continue my application',
    };
  } catch {
    return { state: 'signed-out' };
  }
}

// The header and both sign-up blocks ask at once; look it up once per page view.
let pending: Promise<SessionDestination> | null = null;

/** Where a signed-in visitor should go from the public site. */
export function useSessionDestination(): SessionDestination {
  const [result, setResult] = useState<SessionDestination>({ state: 'loading' });

  useEffect(() => {
    let cancelled = false;
    pending ??= resolveDestination().finally(() => {
      // Let a later visit (e.g. after signing in) look again.
      setTimeout(() => {
        pending = null;
      }, 0);
    });
    void pending.then((destination) => {
      if (!cancelled) setResult(destination);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return result;
}
