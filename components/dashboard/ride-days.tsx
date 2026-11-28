'use client';

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import Icon from '@/components/ui/icons';
import { addDays, getPakistanDate, getPakistanTime } from '@/lib/date/pakistan';
import { fetchOperationsSettings, formatClock, DEFAULT_OPERATIONS_SETTINGS } from '@/lib/settings/operations';

export const SKIP_DAYS_AHEAD = 14;

/** Days from tomorrow, for the "not riding" picker. Tomorrow locks at the cutoff. */
export function skipWindow(today: string, nowHHMM: string, cutoff: string) {
  return Array.from({ length: SKIP_DAYS_AHEAD }, (_, index) => {
    const date = addDays(today, index + 1);
    return { date, locked: index === 0 && nowHHMM >= cutoff };
  });
}

const label = (iso: string) => {
  const date = new Date(`${iso}T00:00:00Z`);
  return {
    day: date.toLocaleDateString('en-PK', { weekday: 'short', timeZone: 'UTC' }),
    num: date.toLocaleDateString('en-PK', { day: 'numeric', timeZone: 'UTC' }),
    month: date.toLocaleDateString('en-PK', { month: 'short', timeZone: 'UTC' }),
  };
};

/** "I won't ride on these days": frees the seat and keeps the van from waiting. */
export default function RideDays({
  supabase,
  studentId,
  holidays,
  demo,
}: {
  supabase: SupabaseClient;
  studentId: string;
  holidays: { date: string; reason: string }[];
  demo: boolean;
}) {
  const [today] = useState(() => getPakistanDate());
  const [now] = useState(() => getPakistanTime());
  const [cutoff, setCutoff] = useState(DEFAULT_OPERATIONS_SETTINGS.skip_cutoff);
  const [skips, setSkips] = useState<Set<string>>(new Set());
  const [available, setAvailable] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (demo) return;
    void Promise.all([
      fetchOperationsSettings(supabase),
      supabase.from('ride_skips').select('skip_date').eq('student_id', studentId).gt('skip_date', today),
    ]).then(([settings, { data, error }]) => {
      if (settings) setCutoff(settings.skip_cutoff);
      if (error) setAvailable(false);
      else setSkips(new Set((data ?? []).map((row) => row.skip_date as string)));
    });
  }, [demo, studentId, supabase, today]);

  const days = skipWindow(today, now, cutoff);
  const holidayOn = new Map(holidays.map((holiday) => [holiday.date, holiday.reason]));

  const toggle = async (date: string) => {
    const skipping = !skips.has(date);
    setBusy(date);
    setMessage(null);
    const { error } = demo
      ? { error: null }
      : skipping
        ? await supabase.from('ride_skips').insert({ student_id: studentId, skip_date: date })
        : await supabase.from('ride_skips').delete().eq('student_id', studentId).eq('skip_date', date);
    setBusy(null);
    if (error) {
      setMessage({ tone: 'error', text: /closed at|two weeks/i.test(error.message) ? error.message : 'Could not save. Try again.' });
      return;
    }
    setSkips((current) => {
      const next = new Set(current);
      if (skipping) next.add(date);
      else next.delete(date);
      return next;
    });
    const { day, num, month } = label(date);
    setMessage({ tone: 'ok', text: skipping ? `Marked ${day} ${num} ${month} as not riding. Your seat is freed for that day.` : `You're riding on ${day} ${num} ${month} again.` });
  };

  if (!available) return null;

  return (
    <section aria-labelledby="ride-days-title" className="rounded-3xl border border-white/[0.08] bg-[#10151d] p-5 shadow-[0_18px_42px_rgba(0,0,0,0.14)] sm:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-yellow-200/70">Not riding?</p>
      <h2 id="ride-days-title" className="mt-1 text-lg font-semibold text-white">Days you won&apos;t ride</h2>
      <p className="mt-1 text-sm text-zinc-400">Tap a day so the van doesn&apos;t wait for you. Tomorrow can be changed until {formatClock(cutoff)}.</p>
      <ul className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Next two weeks">
        {days.map(({ date, locked }) => {
          const { day, num, month } = label(date);
          const holiday = holidayOn.get(date);
          const skipped = skips.has(date);
          return (
            <li key={date} className="shrink-0">
              <button
                type="button"
                aria-pressed={skipped}
                aria-label={`${day} ${num} ${month}: ${holiday ? `no service, ${holiday}` : skipped ? 'not riding' : 'riding'}`}
                disabled={Boolean(holiday) || locked || busy === date}
                onClick={() => void toggle(date)}
                className={`flex w-16 flex-col items-center rounded-2xl border px-2 py-2.5 text-center transition disabled:cursor-not-allowed ${
                  holiday
                    ? 'border-sky-300/15 bg-sky-300/[0.05] text-sky-200/70'
                    : skipped
                      ? 'border-red-300/30 bg-red-300/10 text-red-100'
                      : 'border-white/[0.08] bg-black/20 text-zinc-200 hover:border-yellow-300/30'
                } ${locked ? 'opacity-50' : ''}`}
              >
                <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{day}</span>
                <span className="mt-0.5 text-lg font-semibold">{num}</span>
                <span className="text-[10px]">{holiday ? 'Off' : skipped ? 'Not riding' : locked ? 'Locked' : month}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {message && (
        <p role={message.tone === 'error' ? 'alert' : 'status'} className={`mt-3 flex items-center gap-2 text-sm ${message.tone === 'error' ? 'text-red-200' : 'text-emerald-200'}`}>
          {message.tone === 'ok' && <Icon name="check" size={16} />}
          {message.text}
        </p>
      )}
    </section>
  );
}
