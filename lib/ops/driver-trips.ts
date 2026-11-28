import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

export type DriverTripRow = {
  student_id: string;
  coaster_id: string | null;
  attendance_status: 'present' | 'absent' | null;
  coasters: { coaster_number: string } | { coaster_number: string }[] | null;
  profiles: { id: string; phone: string | null; full_name: string | null; whatsapp_opt_in: boolean | null } | { id: string; phone: string | null; full_name: string | null; whatsapp_opt_in: boolean | null }[] | null;
};

export const one = <T,>(value: T | T[] | null): T | null => (Array.isArray(value) ? (value[0] ?? null) : value);

/** A driver's trips for a date, with the riders' contact details (server only). */
export async function driverTrips(service: SupabaseClient, driverId: string, date: string) {
  const { data, error } = await service
    .from('daily_assignments')
    .select('student_id, coaster_id, attendance_status, coasters(coaster_number), profiles!inner(id, phone, full_name, whatsapp_opt_in)')
    .eq('driver_id', driverId)
    .eq('assignment_date', date);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as DriverTripRow[];
}

/** Whether trip-update WhatsApps are on (operations.trip_whatsapp, default on). */
export async function tripWhatsAppEnabled(service: SupabaseClient) {
  const { data } = await service.from('app_settings').select('value').eq('key', 'operations').maybeSingle();
  return (data?.value as { trip_whatsapp?: boolean } | undefined)?.trip_whatsapp !== false;
}
