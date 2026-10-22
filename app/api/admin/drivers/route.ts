import { NextResponse } from 'next/server';
import { createServiceClient, getAdminFromRequest } from '@/lib/supabase/service';

export async function POST(request: Request) {
  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ error: 'Driver account creation is not configured on the server.' }, { status: 503 });
  }
  const adminId = await getAdminFromRequest(request, service);
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { email?: string; fullName?: string; phone?: string; cnic?: string; usualVehicleId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? '';
  const fullName = body.fullName?.trim() ?? '';
  if (!/^\S+@\S+\.\S+$/.test(email) || !fullName) {
    return NextResponse.json({ error: 'Enter a valid email and driver name.' }, { status: 400 });
  }

  const { data: authData, error: authError } = await service.auth.admin.inviteUserByEmail(email, {
    data: { account_type: 'driver', full_name: fullName },
  });
  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Could not create the driver login.' }, { status: 400 });
  }

  const { data, error } = await service.from('drivers').insert({
    id: authData.user.id,
    email,
    full_name: fullName,
    phone: body.phone?.trim() || null,
    cnic: body.cnic?.trim() || null,
    usual_vehicle_id: body.usualVehicleId || null,
    created_by: adminId,
  }).select('id, email, full_name, phone, cnic, usual_vehicle_id, active, created_at').single();

  if (error || !data) {
    await service.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: error?.message ?? 'Could not save the driver account.' }, { status: 400 });
  }
  return NextResponse.json({ driver: data }, { status: 201 });
}
