'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import Icon from '@/components/ui/icons';
import { getPakistanDate } from '@/lib/date/pakistan';
import { buildChecklist, type ChecklistInput } from '@/lib/ops/checklist';
import { PROBLEM_LABELS, type ProblemType, type TripLeg } from '@/lib/ops/trip-messages';
import { card } from './ui';

type Problem = {
  id: string;
  driver_id: string;
  leg: TripLeg;
  problem_type: ProblemType | null;
  note: string | null;
  created_at: string;
  resolved_at: string | null;
  riders_notified: number;
};
type FailedCheck = { driver_id: string; coaster_id: string | null; notes: string | null; fuel_ok: boolean; tyres_ok: boolean; lights_ok: boolean; brakes_ok: boolean; mirrors_horn_ok: boolean };

const CHECK_LABELS: [keyof FailedCheck, string][] = [
  ['fuel_ok', 'Fuel'],
  ['tyres_ok', 'Tyres'],
  ['lights_ok', 'Lights'],
  ['brakes_ok', 'Brakes'],
  ['mirrors_horn_ok', 'Mirrors & horn'],
];
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Karachi' });

/** What to look at before the first van leaves. */
export default function MorningChecklist({
  supabase,
  students,
  coasters,
  drivers,
  applications,
  holidays,
  onOpenTab,
}: {
  supabase: SupabaseClient;
  students: ChecklistInput['students'];
  coasters: ChecklistInput['coasters'];
  drivers: (ChecklistInput['drivers'][number] & { phone?: string | null })[];
  applications: ChecklistInput['applications'];
  holidays: { date: string; reason: string }[];
  onOpenTab: (tab: string) => void;
}) {
  const [today] = useState(() => getPakistanDate());
  const [nowMs, setNowMs] = useState(0);
  const [trips, setTrips] = useState<ChecklistInput['todayTrips']>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [failedChecks, setFailedChecks] = useState<FailedCheck[]>([]);
  const [opsReady, setOpsReady] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [tripRes, problemRes, checkRes] = await Promise.all([
      supabase.from('daily_assignments').select('student_id, coaster_id, seat_confirmed').eq('assignment_date', today),
      supabase.from('trip_events').select('id, driver_id, leg, problem_type, note, created_at, resolved_at, riders_notified').eq('trip_date', today).eq('kind', 'problem').order('created_at', { ascending: false }),
      supabase.from('vehicle_checks').select('driver_id, coaster_id, notes, fuel_ok, tyres_ok, lights_ok, brakes_ok, mirrors_horn_ok').eq('check_date', today).eq('all_ok', false),
    ]);
    setNowMs(Date.now());
    if (tripRes.data) setTrips(tripRes.data as ChecklistInput['todayTrips']);
    setOpsReady(!problemRes.error && !checkRes.error);
    if (problemRes.data) setProblems(problemRes.data as Problem[]);
    if (checkRes.data) setFailedChecks(checkRes.data as FailedCheck[]);
    setLoaded(true);
  }, [supabase, today]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 120_000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [load]);

  const holidayToday = holidays.find((holiday) => holiday.date === today)?.reason ?? null;
  const items = loaded
    ? buildChecklist({ today, holidayToday, students, todayTrips: trips, coasters, drivers, applications, problems, failedChecks: failedChecks.length, nowMs })
    : [];
  const driverName = (id: string) => drivers.find((driver) => driver.id === id)?.full_name ?? 'Driver';
  const driverPhone = (id: string) => drivers.find((driver) => driver.id === id)?.phone ?? null;
  const vehicleName = (id: string | null) => coasters.find((coaster) => coaster.id === id)?.coaster_number ?? 'vehicle';
  const openProblems = problems.filter((problem) => !problem.resolved_at);

  const resolve = async (id: string) => {
    setResolving(id);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const resolvedAt = new Date().toISOString();
    const { error } = await supabase.from('trip_events').update({ resolved_at: resolvedAt, resolved_by: user?.id ?? null }).eq('id', id);
    setResolving(null);
    if (!error) setProblems((current) => current.map((problem) => (problem.id === id ? { ...problem, resolved_at: resolvedAt } : problem)));
  };

  return (
    <section aria-labelledby="checklist-title" className={card}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-yellow-300">Before the first van leaves</p>
          <h2 id="checklist-title" className="mt-1 text-xl font-semibold text-white">Morning checklist</h2>
        </div>
        {holidayToday && <span className="rounded-full bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-200">No service today: {holidayToday}</span>}
      </div>

      {!loaded ? (
        <p className="mt-4 text-sm text-zinc-500">Checking today…</p>
      ) : items.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] px-4 py-3 text-sm text-emerald-100">
          <Icon name="check" size={18} /> All clear for today.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => (item.key === 'problems' ? document.getElementById('driver-problems')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) : onOpenTab(item.tab))}
                className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-left transition hover:border-zinc-700"
              >
                <span className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-bold ${item.tone === 'urgent' ? 'bg-red-500/15 text-red-200' : 'bg-amber-400/10 text-amber-200'}`}>{item.count}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-zinc-100">{item.label}</span>
                  {item.detail && <span className="block truncate text-xs text-zinc-500">{item.detail}</span>}
                </span>
                <Icon name="arrow-right" size={16} className="text-zinc-500" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!opsReady && loaded && (
        <p className="mt-4 text-xs text-zinc-500">Driver problem reports and vehicle checks appear here once the driver-operations database update is applied.</p>
      )}

      {(openProblems.length > 0 || failedChecks.length > 0) && (
        <div id="driver-problems" className="mt-5 space-y-2 scroll-mt-28">
          <h3 className="text-sm font-semibold text-white">From drivers today</h3>
          {openProblems.map((problem) => {
            const phone = driverPhone(problem.driver_id);
            return (
              <div key={problem.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-red-100">
                    {PROBLEM_LABELS[problem.problem_type ?? 'other']} · {driverName(problem.driver_id)} · {problem.leg} · {time(problem.created_at)}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {problem.note ? `${problem.note} · ` : ''}{problem.riders_notified > 0 ? `${problem.riders_notified} riders told.` : 'Riders not told.'}
                  </p>
                </div>
                <div className="flex gap-2">
                  {phone && (
                    <a href={`tel:${phone}`} className="ee-btn ee-btn-secondary min-h-10 px-3 text-xs">
                      <Icon name="phone" size={15} /> Call
                    </a>
                  )}
                  <button type="button" disabled={resolving === problem.id} aria-busy={resolving === problem.id} data-loading={resolving === problem.id ? 'true' : undefined} onClick={() => void resolve(problem.id)} className="ee-btn ee-btn-secondary min-h-10 px-3 text-xs">
                    Mark handled
                  </button>
                </div>
              </div>
            );
          })}
          {failedChecks.map((check) => (
            <div key={check.driver_id} className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] px-4 py-3">
              <p className="text-sm font-medium text-amber-100">
                Vehicle check · {vehicleName(check.coaster_id)} · {driverName(check.driver_id)}
              </p>
              <p className="text-xs text-zinc-400">
                {CHECK_LABELS.filter(([key]) => !check[key]).map(([, label]) => label).join(', ')}
                {check.notes ? ` · ${check.notes}` : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
