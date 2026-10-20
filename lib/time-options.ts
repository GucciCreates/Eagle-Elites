import type { SupabaseClient } from '@supabase/supabase-js';

export type TimeKind = 'arrival' | 'departure';

export type TimeOption = {
  id: string;
  kind: TimeKind;
  time_value: string; // "HH:MM:SS"
  label: string | null;
  group_id: string | null;
  sort_order: number;
  active: boolean;
};

/** "07:15:00" -> "07:15" */
export function toHHMM(value: string | null | undefined) {
  return value ? value.slice(0, 5) : '';
}

/** "07:15" -> "7:15 AM" */
export function formatTime12(value: string | null | undefined) {
  const hhmm = toHHMM(value);
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function optionLabel(option: TimeOption) {
  const time = formatTime12(option.time_value);
  return option.label ? `${time} · ${option.label}` : time;
}

/**
 * Active options a student can pick: global ones plus their group's.
 * Group-specific options with the same time replace the global one.
 */
export async function fetchTimeOptionsForGroup(
  supabase: SupabaseClient,
  groupId: string | null | undefined,
) {
  let query = supabase
    .from('time_options')
    .select('*')
    .eq('active', true)
    .order('sort_order')
    .order('time_value');

  query = groupId
    ? query.or(`group_id.is.null,group_id.eq.${groupId}`)
    : query.is('group_id', null);

  const { data, error } = await query;
  if (error || !data) return { arrival: [], departure: [] };

  const pick = (kind: TimeKind) => {
    const byTime = new Map<string, TimeOption>();
    for (const option of data as TimeOption[]) {
      if (option.kind !== kind) continue;
      const key = toHHMM(option.time_value);
      const existing = byTime.get(key);
      if (!existing || (option.group_id && !existing.group_id)) {
        byTime.set(key, option);
      }
    }
    return [...byTime.values()];
  };

  return { arrival: pick('arrival'), departure: pick('departure') };
}
