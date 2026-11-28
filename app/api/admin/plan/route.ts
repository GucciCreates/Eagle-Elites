import { NextResponse } from 'next/server';
import { addDays, getPakistanDate } from '@/lib/date/pakistan';
import { apiError, isIsoDate } from '@/lib/api/validate';
import { isMissingSchema, planDay } from '@/lib/ops/publish-plan';
import { createServiceClient, getAdminFromRequest, getAdminRole } from '@/lib/supabase/service';

/**
 * Preview or publish a day's plan.
 * POST { date: 'YYYY-MM-DD', publish: boolean }
 * Owners and operations staff only.
 */
export async function POST(request: Request) {
  const service = createServiceClient();
  if (!service) return apiError(503, 'Server is missing SUPABASE_SERVICE_ROLE_KEY.');
  const adminId = await getAdminFromRequest(request, service);
  if (!adminId) return apiError(401, 'Unauthorized');
  const role = await getAdminRole(service, adminId);
  if (role !== 'owner' && role !== 'operations') return apiError(403, 'Only owners and operations staff can plan trips.');

  let body: { date?: unknown; publish?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'Invalid JSON');
  }
  const today = getPakistanDate();
  if (!isIsoDate(body.date) || body.date < today || body.date > addDays(today, 14)) {
    return apiError(400, 'Pick a date from today up to two weeks ahead.');
  }
  const publish = body.publish === true;

  try {
    const result = await planDay(service, body.date, { dryRun: !publish });
    if (publish && result.inserted > 0) {
      await service.from('admin_activity_log').insert({
        admin_id: adminId,
        action: 'Published trip plan',
        details: { date: body.date, count: result.inserted },
      });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not build the plan.';
    return apiError(isMissingSchema({ message }) ? 503 : 500, message);
  }
}
