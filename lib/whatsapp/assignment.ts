import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { sendToRecipients, type Recipient } from './send';

function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00+05:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Karachi' });
}

/**
 * Tells riders their vehicle, driver and contact for a date (opted-in
 * students only). Re-sends only when the vehicle or driver changed.
 */
export async function notifyAssignments(service: SupabaseClient, date: string, studentIds: string[]) {
  const ids = [...new Set(studentIds)].slice(0, 1000);
  if (ids.length === 0) return { sent: 0, failed: 0, skipped: 0 };
  const { data } = await service
    .from('daily_assignments')
    .select(
      'student_id, driver_name, driver_contact, coasters(coaster_number), profiles!inner(id, phone, full_name, whatsapp_opt_in)',
    )
    .eq('assignment_date', date)
    .in('student_id', ids);

  type Row = {
    student_id: string;
    driver_name: string | null;
    driver_contact: string | null;
    coasters:
      { coaster_number: string } | { coaster_number: string }[] | null;
    profiles:
      | {
          id: string;
          phone: string | null;
          full_name: string | null;
          whatsapp_opt_in: boolean;
        }
      | {
          id: string;
          phone: string | null;
          full_name: string | null;
          whatsapp_opt_in: boolean;
        }[];
  };
  const one = <T>(value: T | T[] | null): T | null =>
    Array.isArray(value) ? (value[0] ?? null) : value;

  const rows = ((data ?? []) as Row[]).filter(
    (row) => one(row.profiles)?.whatsapp_opt_in,
  );
  const byStudent = new Map(rows.map((row) => [row.student_id, row]));

  return sendToRecipients(
    service,
    'assignment',
    rows.map((row) => one(row.profiles)!) as Recipient[],
    (r) => {
      const row = byStudent.get(r.id ?? '');
      return [
        r.full_name || 'Student',
        formatDate(date),
        one(row?.coasters ?? null)?.coaster_number || '-',
        row?.driver_name || '-',
        row?.driver_contact || '-',
      ];
    },
    // Re-sends if the vehicle/driver changes for the same day.
    (r) => {
      const row = byStudent.get(r.id ?? '');
      return `assignment:${date}:${r.id}:${one(row?.coasters ?? null)?.coaster_number}:${row?.driver_name}:${row?.driver_contact}`;
    },
  );
}
