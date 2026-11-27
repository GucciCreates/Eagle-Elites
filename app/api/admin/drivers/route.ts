import { NextResponse } from 'next/server';
import { createServiceClient, getAdminFromRequest } from '@/lib/supabase/service';
import { apiError, isUuid, optionalText, text } from '@/lib/api/validate';

export async function POST(request: Request) {
  const service = createServiceClient();
  if (!service) {
    return apiError(503, 'Driver account creation is not configured on the server.');
  }
  const adminId = await getAdminFromRequest(request, service);
  if (!adminId) return apiError(401, 'Unauthorized');

  let body: { email?: string; fullName?: string; phone?: string; cnic?: string; usualVehicleId?: string };
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'Invalid request body.');
  }

  const email = text(body.email, { max: 254 })?.toLowerCase() ?? '';
  const fullName = text(body.fullName, { max: 120 });
  const phone = optionalText(body.phone, 20);
  const cnic = optionalText(body.cnic, 20);
  const usualVehicleId = body.usualVehicleId ? body.usualVehicleId : null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !fullName) {
    return apiError(400, 'Enter a valid email and driver name.');
  }
  if (phone === undefined || cnic === undefined || (usualVehicleId !== null && !isUuid(usualVehicleId))) {
    return apiError(400, 'Check the phone, CNIC and vehicle fields.');
  }

  const { data: authData, error: authError } = await service.auth.admin.inviteUserByEmail(email, {
    data: { account_type: 'driver', full_name: fullName },
  });
  if (authError || !authData.user) {
    return apiError(400, authError?.message ?? 'Could not create the driver login.');
  }

  const { data, error } = await service.from('drivers').insert({
    id: authData.user.id,
    email,
    full_name: fullName,
    phone,
    cnic,
    usual_vehicle_id: usualVehicleId,
    created_by: adminId,
  }).select('id, email, full_name, phone, cnic, usual_vehicle_id, active, created_at').single();

  if (error || !data) {
    await service.auth.admin.deleteUser(authData.user.id);
    return apiError(400, error?.message ?? 'Could not save the driver account.');
  }
  return NextResponse.json({ ok: true, driver: data }, { status: 201 });
}
