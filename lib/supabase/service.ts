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

/** The signed-in user behind the request's bearer token, or null. */
export async function getRequestUserId(request: Request, service: SupabaseClient): Promise<string | null> {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  const { data, error } = await service.auth.getUser(token);
  return error || !data.user ? null : data.user.id;
}

export type StaffRole = 'owner' | 'operations' | 'accounts';

/**
 * The admin's staff role. Before the admin-operations migration is applied
 * there is no role column, and every admin counts as owner (as today).
 */
export async function getAdminRole(service: SupabaseClient, adminId: string): Promise<StaffRole | null> {
  const { data, error } = await service.from('admin_users').select('staff_role').eq('id', adminId).maybeSingle();
  if (error) {
    const { data: plain } = await service.from('admin_users').select('id').eq('id', adminId).maybeSingle();
    return plain ? 'owner' : null;
  }
  if (!data) return null;
  const role = (data as { staff_role?: string }).staff_role;
  return role === 'operations' || role === 'accounts' ? role : 'owner';
}

export type RequestDriver = { id: string; full_name: string; phone: string | null; usual_vehicle_id: string | null };

/** An active driver behind the request's bearer token, or null. */
export async function getDriverFromRequest(request: Request, service: SupabaseClient): Promise<RequestDriver | null> {
  const userId = await getRequestUserId(request, service);
  if (!userId) return null;
  const { data } = await service
    .from('drivers')
    .select('id, full_name, phone, usual_vehicle_id')
    .eq('id', userId)
    .eq('active', true)
    .maybeSingle();
  return (data as RequestDriver | null) ?? null;
}

/**
 * Verifies the request's bearer token belongs to an admin.
 * Returns the admin's user id, or null.
 */
export async function getAdminFromRequest(
  request: Request,
  service: SupabaseClient,
): Promise<string | null> {
  const userId = await getRequestUserId(request, service);
  if (!userId) return null;
  const { data: admin } = await service.from('admin_users').select('id').eq('id', userId).maybeSingle();
  return admin ? userId : null;
}
