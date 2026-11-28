import { NextResponse } from 'next/server';
import { apiError, isUuid } from '@/lib/api/validate';
import { getPakistanDate } from '@/lib/date/pakistan';
import { driverTrips, one } from '@/lib/ops/driver-trips';
import { hereMessage, TRIP_LEGS, type TripLeg } from '@/lib/ops/trip-messages';
import { createServiceClient, getDriverFromRequest } from '@/lib/supabase/service';
import { sendToRecipients, type Recipient } from '@/lib/whatsapp/send';

/**
 * "I'm here": tells one rider on the driver's trip today that the vehicle
 * is at their pickup point, without showing the driver their number.
 * POST { studentId, leg }
 */
export async function POST(request: Request) {
  const service = createServiceClient();
  if (!service) return apiError(503, 'Server is missing SUPABASE_SERVICE_ROLE_KEY.');
  const driver = await getDriverFromRequest(request, service);
  if (!driver) return apiError(401, 'Unauthorized');

  let body: { studentId?: unknown; leg?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'Invalid JSON');
  }
  if (!isUuid(body.studentId) || !TRIP_LEGS.includes(body.leg as TripLeg)) return apiError(400, 'Invalid request.');

  const date = getPakistanDate();
  const trips = await driverTrips(service, driver.id, date).catch(() => null);
  const trip = trips?.find((row) => row.student_id === body.studentId);
  if (!trip) return apiError(404, 'This student is not on your trip today.');
  const rider = one(trip.profiles);
  if (!rider?.whatsapp_opt_in) return NextResponse.json({ ok: true, sent: 0, reason: 'This student has WhatsApp updates turned off.' });

  const message = hereMessage(one(trip.coasters)?.coaster_number ?? null);
  const summary = await sendToRecipients(
    service,
    'announcement',
    [rider as Recipient],
    () => [message.title, message.message],
    (r) => `here:${date}:${body.leg}:${r.id}`,
  );
  return NextResponse.json({
    ok: true,
    sent: summary.sent,
    reason: summary.sent ? undefined : summary.skipped ? 'Already sent, or WhatsApp is not set up.' : 'Could not send right now.',
  });
}
