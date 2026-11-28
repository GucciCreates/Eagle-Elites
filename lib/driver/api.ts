'use client';

import { createClient } from '@/lib/supabase/client';

export type DriverApiResult = { ok: boolean; error?: string; notified?: number; sent?: number; reason?: string };

/** Calls a driver API route with the signed-in driver's session. */
export async function driverApi(path: '/api/driver/trip-status' | '/api/driver/notify-student', body: unknown): Promise<DriverApiResult> {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { ok: false, error: 'Please sign in again.' };
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    });
    return (await res.json()) as DriverApiResult;
  } catch {
    return { ok: false, error: 'No connection. Try again when you have signal.' };
  }
}

/** True when a failed request looks like lost signal rather than a refusal. */
export function isOfflineError(message: string | undefined) {
  return (typeof navigator !== 'undefined' && !navigator.onLine) || /failed to fetch|fetch failed|network|load failed/i.test(message ?? '');
}
