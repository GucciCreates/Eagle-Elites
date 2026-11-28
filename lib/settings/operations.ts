import type { SupabaseClient } from '@supabase/supabase-js';

export type OperationsSettings = {
  /** Last time (Pakistan, HH:MM) to change tomorrow's "not riding". */
  skip_cutoff: string;
  /** Publish tomorrow's plan automatically each evening. */
  auto_plan: boolean;
  /** Send riders a WhatsApp message when the driver taps a trip status. */
  trip_whatsapp: boolean;
};

export const DEFAULT_OPERATIONS_SETTINGS: OperationsSettings = { skip_cutoff: '21:00', auto_plan: true, trip_whatsapp: true };

export function parseOperationsSettings(value: unknown): OperationsSettings {
  const v = (value && typeof value === 'object' ? value : {}) as Partial<Record<keyof OperationsSettings, unknown>>;
  const cutoff = typeof v.skip_cutoff === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v.skip_cutoff) ? v.skip_cutoff : DEFAULT_OPERATIONS_SETTINGS.skip_cutoff;
  return {
    skip_cutoff: cutoff,
    auto_plan: typeof v.auto_plan === 'boolean' ? v.auto_plan : DEFAULT_OPERATIONS_SETTINGS.auto_plan,
    trip_whatsapp: typeof v.trip_whatsapp === 'boolean' ? v.trip_whatsapp : DEFAULT_OPERATIONS_SETTINGS.trip_whatsapp,
  };
}

/** Reads the operations settings; null when the row is not there yet. */
export async function fetchOperationsSettings(supabase: SupabaseClient): Promise<OperationsSettings | null> {
  const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'operations').maybeSingle();
  if (error || !data) return null;
  return parseOperationsSettings(data.value);
}

/** "21:00" → "9:00 PM" */
export function formatClock(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
