// Server-only: never import this from a client component.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client using the service role key (bypasses RLS).
 * Returns null when the key isn't configured.
 */
export function createServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Verifies the request's bearer token belongs to an admin.
 * Returns the admin's user id, or null.
 */
export async function getAdminFromRequest(
  request: Request,
  service: SupabaseClient,
): Promise<string | null> {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;

  const { data, error } = await service.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: admin } = await service
    .from('admin_users')
    .select('id')
    .eq('id', data.user.id)
    .maybeSingle();

  return admin ? data.user.id : null;
}
