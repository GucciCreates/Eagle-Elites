import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Bounded queries for the admin dashboard. Each one fetches what the
 * screens actually show instead of every row ever written.
 */

/** Student columns the admin screens read (profiles also hold private payment and guardian data). */
export const ADMIN_STUDENT_COLUMNS =
  'id, full_name, email, status, fee_status, institution, route_id, departure_group_id, cnic_last4, user_type, department, pickup_area, payment_proof_url, phone, fee_due_date, routes!profiles_route_id_fkey(name)';

/** How many days of past departure slots load up front. Older dates load when picked. */
export const SLOT_HISTORY_DAYS = 14;
/** Resolved, already-read help messages kept on screen (open or unread ones always load). */
export const CLOSED_MESSAGE_LIMIT = 100;
export const ANNOUNCEMENT_LIMIT = 100;
export const PAYMENT_HISTORY_LIMIT = 100;

/** ISO date `days` before `isoDate` (both YYYY-MM-DD). */
export function shiftIsoDate(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Merge row lists, keeping the first copy of each key and the original order. */
export function mergeUnique<T>(lists: T[][], key: (row: T) => string): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];
  for (const list of lists) {
    for (const row of list) {
      const id = key(row);
      if (seen.has(id)) continue;
      seen.add(id);
      merged.push(row);
    }
  }
  return merged;
}

export async function fetchAdminStudents(supabase: SupabaseClient) {
  const narrow = await supabase
    .from('profiles')
    .select(ADMIN_STUDENT_COLUMNS)
    .eq('role', 'student')
    .order('full_name');
  if (!narrow.error) return narrow;
  // An optional column missing in this project: fall back to the old query
  // rather than showing an empty student list.
  return supabase
    .from('profiles')
    .select('*, routes!profiles_route_id_fkey(name)')
    .eq('role', 'student')
    .order('full_name');
}

/** Every open or unread message (so counts stay right) plus the latest closed ones. */
export async function fetchHelpMessages(supabase: SupabaseClient) {
  const columns = '*, profiles(full_name, email)';
  const [active, closed] = await Promise.all([
    supabase
      .from('help_messages')
      .select(columns)
      .or('status.neq.resolved,admin_read_at.is.null')
      .order('created_at', { ascending: false }),
    supabase
      .from('help_messages')
      .select(columns)
      .eq('status', 'resolved')
      .not('admin_read_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(CLOSED_MESSAGE_LIMIT),
  ]);
  const error = active.error ?? closed.error;
  if (error) return { data: null, error };
  const rows = mergeUnique(
    [(active.data ?? []) as { id: string; created_at: string }[], (closed.data ?? []) as { id: string; created_at: string }[]],
    (row) => row.id,
  ).sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
  return { data: rows, error: null };
}

export function fetchAnnouncements(supabase: SupabaseClient) {
  return supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(ANNOUNCEMENT_LIMIT);
}

/** Departure slots dated `from` onwards (`to` limits it to a range). */
export function fetchDepartureSlots(supabase: SupabaseClient, from: string, to?: string) {
  let query = supabase.from('departure_slots').select('*').gte('slot_date', from);
  if (to) query = query.lte('slot_date', to);
  return query.order('slot_date', { ascending: false }).order('slot_number', { ascending: true });
}

type FeePaymentRow = { student_id: string; fee_month: string; amount: number; recorded_at: string };

/** Payments for one fee month (YYYY-MM) plus the latest entries for the history table. */
export async function fetchFeePayments(supabase: SupabaseClient, month: string) {
  const columns = 'student_id, fee_month, amount, recorded_at';
  const [forMonth, recent] = await Promise.all([
    supabase.from('fee_payments').select(columns).eq('fee_month', `${month}-01`),
    supabase
      .from('fee_payments')
      .select(columns)
      .order('fee_month', { ascending: false })
      .order('recorded_at', { ascending: false })
      .limit(PAYMENT_HISTORY_LIMIT),
  ]);
  const error = forMonth.error ?? recent.error;
  if (error) return { data: null, error };
  // History first so the table keeps its newest-first order.
  const rows = mergeUnique(
    [(recent.data ?? []) as FeePaymentRow[], (forMonth.data ?? []) as FeePaymentRow[]],
    (row) => `${row.student_id}:${row.fee_month}`,
  );
  return { data: rows, error: null };
}
