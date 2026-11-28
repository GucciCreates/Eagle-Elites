import { NextResponse } from 'next/server';
import { apiError, isUuid } from '@/lib/api/validate';
import { isMissingSchema } from '@/lib/ops/publish-plan';
import { createServiceClient, getAdminFromRequest, getAdminRole, type StaffRole } from '@/lib/supabase/service';

const ROLES: StaffRole[] = ['owner', 'operations', 'accounts'];

async function requireOwner(request: Request) {
  const service = createServiceClient();
  if (!service) return { error: apiError(503, 'Server is missing SUPABASE_SERVICE_ROLE_KEY.') };
  const adminId = await getAdminFromRequest(request, service);
  if (!adminId) return { error: apiError(401, 'Unauthorized') };
  if ((await getAdminRole(service, adminId)) !== 'owner') return { error: apiError(403, 'Only owners manage staff roles.') };
  return { service, adminId };
}

/** Admin accounts with their email and staff role. Owners only. */
export async function GET(request: Request) {
  const auth = await requireOwner(request);
  if ('error' in auth) return auth.error;
  const { service, adminId } = auth;

  const { data, error } = await service.from('admin_users').select('id, staff_role');
  if (error) {
    return apiError(
      isMissingSchema(error) ? 503 : 500,
      isMissingSchema(error) ? 'Staff roles need the latest database update. Ask the owner to apply it.' : 'Could not load staff.',
    );
  }
  const staff = await Promise.all(
    (data ?? []).map(async (row) => {
      const { data: user } = await service.auth.admin.getUserById(row.id as string);
      return { id: row.id as string, email: user.user?.email ?? 'Unknown', role: row.staff_role as StaffRole, you: row.id === adminId };
    }),
  );
  staff.sort((a, b) => a.email.localeCompare(b.email));
  return NextResponse.json({ ok: true, staff });
}

/** Change one admin's role. PATCH { id, role } */
export async function PATCH(request: Request) {
  const auth = await requireOwner(request);
  if ('error' in auth) return auth.error;
  const { service, adminId } = auth;

  let body: { id?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'Invalid JSON');
  }
  if (!isUuid(body.id) || !ROLES.includes(body.role as StaffRole)) return apiError(400, 'Choose a staff member and a role.');

  const { data, error } = await service.from('admin_users').update({ staff_role: body.role }).eq('id', body.id).select('id');
  if (error) return apiError(400, /at least one owner/i.test(error.message) ? 'Keep at least one owner.' : 'Could not change the role.');
  if (!data?.length) return apiError(404, 'No such admin.');
  await service.from('admin_activity_log').insert({ admin_id: adminId, action: 'Changed staff role', details: { staff_id: body.id, role: body.role } });
  return NextResponse.json({ ok: true });
}
