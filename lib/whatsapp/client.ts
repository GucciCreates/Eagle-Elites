'use client';

import { createClient } from '@/lib/supabase/client';

export type NotifyPayload =
  | { event: 'approval'; studentId: string }
  | { event: 'rejection'; studentId: string }
  | { event: 'holiday'; date: string; reason: string }
  | { event: 'assignment'; date: string; studentIds: string[] }
  | { event: 'announcement'; title: string; message: string; targetType?: string; targetValue?: string | null }
  | { event: 'test'; phone: string };

export type NotifyResponse = {
  ok: boolean;
  configured?: boolean;
  sent?: number;
  failed?: number;
  skipped?: number;
  error?: string;
};

/** Calls the admin-only WhatsApp API route with the current session. */
export async function notifyWhatsApp(
  payload: NotifyPayload,
): Promise<NotifyResponse> {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { ok: false, error: 'Not signed in' };

    const res = await fetch('/api/whatsapp/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });
    return (await res.json()) as NotifyResponse;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Request failed',
    };
  }
}
