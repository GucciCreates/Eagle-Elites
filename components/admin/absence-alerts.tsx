'use client';

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { addDays, getPakistanDate } from '@/lib/date/pakistan';
import { findAbsenceAlerts, type AbsenceAlert, type AttendanceRow } from '@/lib/ops/absence';
import { card } from './ui';

export const ABSENCE_WINDOW_DAYS = 21;

/** Students who keep missing the van. For admins only: guardians are never messaged. */
export default function AbsenceAlerts({
  supabase,
  students,
}: {
  supabase: SupabaseClient;
  students: { id: string; full_name: string; phone?: string | null; institution?: string | null; routes?: { name: string } }[];
}) {
  const [alerts, setAlerts] = useState<AbsenceAlert[] | null>(null);

  useEffect(() => {
    const today = getPakistanDate();
    void supabase
      .from('daily_assignments')
      .select('student_id, assignment_date, attendance_status')
      .gte('assignment_date', addDays(today, -ABSENCE_WINDOW_DAYS))
      .lte('assignment_date', today)
      .not('attendance_status', 'is', null)
      .then(({ data }) => setAlerts(findAbsenceAlerts((data ?? []) as AttendanceRow[])));
  }, [supabase]);

  return (
    <section className={card} aria-labelledby="absence-title">
      <h2 id="absence-title" className="text-xl font-semibold text-white">Absence alerts</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Last {ABSENCE_WINDOW_DAYS} days: missed 3 trips in a row, or half of their trips. Only admins see this; no one else is told.
      </p>
      {!alerts ? (
        <p className="mt-4 text-sm text-zinc-500">Checking attendance…</p>
      ) : alerts.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-zinc-700 px-4 py-6 text-center text-sm text-zinc-400">No one is missing trips often.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {alerts.map((alert) => {
            const student = students.find((item) => item.id === alert.student_id);
            return (
              <li key={alert.student_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-white">{student?.full_name ?? 'Student'}</p>
                  <p className="text-xs text-zinc-500">
                    {student?.routes?.name ?? 'No route'} · {alert.kind === 'streak' ? `Absent ${alert.streak} trips in a row` : `Absent ${alert.absent} of ${alert.recorded} trips`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${alert.kind === 'streak' ? 'bg-red-500/15 text-red-200' : 'bg-amber-400/10 text-amber-200'}`}>
                    {alert.kind === 'streak' ? 'In a row' : 'Often'}
                  </span>
                  {student?.phone && (
                    <a href={`tel:${student.phone}`} className="ee-btn ee-btn-secondary min-h-10 px-3 text-xs">
                      Call student
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
