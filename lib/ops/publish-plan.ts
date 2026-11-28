import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { weekdayOf, weekStartOf } from '@/lib/date/pakistan';
import { notifyAssignments } from '@/lib/whatsapp/assignment';
import { buildPlan, type Plan } from './plan';

/** PostgREST / Postgres "table or column doesn't exist" (migration not applied). */
export function isMissingSchema(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(error.code ?? '') || /does not exist|schema cache/i.test(error.message ?? '');
}

/** Reads everything the plan needs for one date. */
export async function loadPlanInput(service: SupabaseClient, date: string) {
  const weekStart = weekStartOf(date);
  const weekday = weekdayOf(date);
  const [students, routes, schedules, skips, existing, coasters, drivers, holidays] = await Promise.all([
    service.from('profiles').select('id, full_name, route_id, status').eq('role', 'student').eq('status', 'active'),
    service.from('routes').select('id, name').order('name'),
    service.from('weekly_schedules').select('student_id, day_of_week').eq('week_start', weekStart),
    service.from('ride_skips').select('student_id').eq('skip_date', date),
    service.from('daily_assignments').select('student_id, coaster_id').eq('assignment_date', date),
    service.from('coasters').select('id, coaster_number, seat_capacity, default_route_id, maintenance_status'),
    service.from('drivers').select('id, full_name, phone, usual_vehicle_id, active').eq('active', true),
    service.from('holidays').select('reason').eq('date', date).limit(1),
  ]);
  const failed = [students, routes, schedules, existing, coasters, drivers, holidays].find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  return {
    date,
    holiday: holidays.data?.[0]?.reason ?? null,
    students: students.data ?? [],
    routes: routes.data ?? [],
    scheduledIds: (schedules.data ?? [])
      .filter((row) => String(row.day_of_week).toLowerCase() === weekday.toLowerCase())
      .map((row) => row.student_id as string),
    // Before the admin-operations migration there is no ride_skips table.
    skippedIds: skips.error ? [] : (skips.data ?? []).map((row) => row.student_id as string),
    existing: existing.data ?? [],
    coasters: coasters.data ?? [],
    drivers: drivers.data ?? [],
  };
}

export type PublishResult = { plan: Plan; inserted: number; whatsapp: { sent: number; failed: number; skipped: number } | null };

/**
 * Builds the plan and, unless dryRun, saves the new trips (never replacing
 * existing ones) and tells those riders on WhatsApp.
 */
export async function planDay(service: SupabaseClient, date: string, { dryRun }: { dryRun: boolean }): Promise<PublishResult> {
  const plan = buildPlan(await loadPlanInput(service, date));
  if (dryRun || plan.rows.length === 0) return { plan, inserted: 0, whatsapp: null };

  const { data, error } = await service
    .from('daily_assignments')
    .upsert(plan.rows, { onConflict: 'student_id,assignment_date', ignoreDuplicates: true })
    .select('student_id');
  if (error) throw new Error(error.message);
  const ids = (data ?? []).map((row) => row.student_id as string);
  const whatsapp = ids.length ? await notifyAssignments(service, date, ids) : null;
  return { plan, inserted: ids.length, whatsapp };
}
