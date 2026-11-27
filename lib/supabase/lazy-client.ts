'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Public pages (landing, marketing) should not ship the Supabase SDK to
 * every visitor. These helpers load it on demand instead.
 */

/** Supabase keeps the browser session in `sb-<project>-auth-token` cookies (chunked as `.0`, `.1`, …). */
export function hasSessionCookie(cookie: string = typeof document === 'undefined' ? '' : document.cookie) {
  return /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=/.test(cookie);
}

let clientPromise: Promise<SupabaseClient> | null = null;

/** The browser Supabase client, downloaded the first time it's needed. */
export function loadSupabaseClient(): Promise<SupabaseClient> {
  clientPromise ??= import('./client').then(({ createClient }) => createClient());
  return clientPromise;
}
