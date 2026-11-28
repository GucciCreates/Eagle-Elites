'use client';

import { createClient } from '@/lib/supabase/client';

export type AdminApiResult<T = Record<string, unknown>> = ({ ok: true } & T) | { ok: false; error: string };

/** Calls an admin API route with the signed-in admin's session. */
export async function adminApi<T = Record<string, unknown>>(
  path: '/api/admin/plan' | '/api/admin/staff',
  init: { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown } = {},
): Promise<AdminApiResult<T>> {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { ok: false, error: 'Please sign in again.' };
    const res = await fetch(path, {
      method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const json = (await res.json().catch(() => null)) as AdminApiResult<T> | null;
    if (!json) return { ok: false, error: `Request failed (${res.status}).` };
    return json;
  } catch {
    return { ok: false, error: 'No connection. Try again.' };
  }
}
