'use client';

import { useEffect, useState } from 'react';
import { getPostLoginPath } from '@/lib/auth/post-login-path';
import { createClient } from '@/lib/supabase/client';

export type SessionDestination =
  | { state: 'loading' }
  | { state: 'signed-out' }
  | { state: 'signed-in'; href: string; label: string };

/** Where a signed-in visitor should go from the public site. */
export function useSessionDestination(): SessionDestination {
  const [result, setResult] = useState<SessionDestination>({ state: 'loading' });

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          if (!cancelled) setResult({ state: 'signed-out' });
          return;
        }
        const id = session.user.id;
        const [{ data: admin }, { data: driver }, { data: profile }] =
          await Promise.all([
            supabase.from('admin_users').select('id').eq('id', id).maybeSingle(),
            supabase
              .from('drivers')
              .select('id')
              .eq('id', id)
              .eq('active', true)
              .maybeSingle(),
            supabase.from('profiles').select('status').eq('id', id).maybeSingle(),
          ]);
        if (cancelled) return;
        if (admin) {
          setResult({ state: 'signed-in', href: '/admin/dashboard', label: 'Open admin dashboard' });
        } else if (driver) {
          setResult({ state: 'signed-in', href: '/driver/dashboard', label: 'Open driver dashboard' });
        } else {
          const href = getPostLoginPath(profile?.status);
          setResult({
            state: 'signed-in',
            href,
            label: href === '/dashboard' ? 'Open my dashboard' : 'Continue my application',
          });
        }
      } catch {
        if (!cancelled) setResult({ state: 'signed-out' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return result;
}
