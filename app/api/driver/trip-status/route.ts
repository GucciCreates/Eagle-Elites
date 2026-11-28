import { NextResponse } from 'next/server';
import { apiError, optionalText } from '@/lib/api/validate';
import { getPakistanDate } from '@/lib/date/pakistan';
import { driverTrips, one, tripWhatsAppEnabled } from '@/lib/ops/driver-trips';
import { isMissingSchema } from '@/lib/ops/publish-plan';
import { PROBLEM_TYPES, TRIP_KINDS, TRIP_LEGS, tripMessage, type ProblemType, type TripKind, type TripLeg } from '@/lib/ops/trip-messages';
import { createServiceClient, getDriverFromRequest } from '@/lib/supabase/service';
import { sendToRecipients, type Recipient } from '@/lib/whatsapp/send';

/**
 * A driver's trip update for today: on the way, arriving, arrived, or a
 * problem report. Records it and, when trip WhatsApps are on, messages the
 * riders on that driver's trips (opted-in, not marked absent).
 * POST { leg, kind, problemType?, note?, notifyRiders? }
 */
export async function POST(request: Request) {
  const service = createServiceClient();
  if (!service) return apiError(503, 'Server is missing SUPABASE_SERVICE_ROLE_KEY.');
  const driver = await getDriverFromRequest(request, service);
  if (!driver) return apiError(401, 'Unauthorized');

  let body: { leg?: unknown; kind?: unknown; problemType?: unknown; note?: unknown; notifyRiders?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'Invalid JSON');
  }
  const leg = body.leg as TripLeg;
  const kind = body.kind as TripKind;
  if (!TRIP_LEGS.includes(leg) || !TRIP_KINDS.includes(kind)) return apiError(400, 'Unknown trip update.');
  const problemType = kind === 'problem' ? (body.problemType as ProblemType) : null;
  if (kind === 'problem' && !PROBLEM_TYPES.includes(problemType!)) return apiError(400, 'Choose what the problem is.');
  const note = optionalText(body.note, 500);
  if (note === undefined) return apiError(400, 'Keep the note under 500 characters.');

  const date = getPakistanDate();
  const trips = await driverTrips(service, driver.id, date).catch(() => null);
  if (!trips) return apiError(500, 'Could not load your trips.');
  if (trips.length === 0) return apiError(400, 'You have no trip assigned today.');
  const vehicle = one(trips[0].coasters)?.coaster_number ?? null;

  const { data: event, error } = await service
    .from('trip_events')
    .insert({ driver_id: driver.id, trip_date: date, leg, kind, problem_type: problemType, note, coaster_id: trips[0].coaster_id })
    .select('id')
    .single();
  if (error) {
    return apiError(
      isMissingSchema(error) ? 503 : 500,
      isMissingSchema(error) ? 'Trip updates need the latest database update. Ask the admin to apply it.' : 'Could not save the update.',
    );
  }

  let notified = 0;
  const message = tripMessage(leg, kind, vehicle, problemType);
  const shouldSend = message && (kind !== 'problem' || body.notifyRiders === true);
  if (shouldSend && (await tripWhatsAppEnabled(service))) {
    const riders = trips
      .filter((trip) => trip.attendance_status !== 'absent' && one(trip.profiles)?.whatsapp_opt_in)
      .map((trip) => one(trip.profiles)!) as Recipient[];
    const summary = await sendToRecipients(
      service,
      'announcement',
      riders,
      () => [message.title, message.message],
      (rider) => (kind === 'problem' ? `trip:${event.id}:${rider.id}` : `trip:${date}:${driver.id}:${leg}:${kind}:${rider.id}`),
    );
    notified = summary.sent;
    if (notified) await service.from('trip_events').update({ riders_notified: notified }).eq('id', event.id);
  }

  return NextResponse.json({ ok: true, notified });
}
