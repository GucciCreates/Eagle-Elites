'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getPakistanDate } from '@/lib/date/pakistan';

type Driver = { id: string; full_name: string };
type Trip = { student_id: string; assignment_date: string; driver_name: string | null; driver_contact: string | null; attendance_status: 'present' | 'absent' | null; coasters: { coaster_number: string } | { coaster_number: string }[] | null };
type Student = { id: string; full_name: string; cnic_last4: string | null; institution: string | null };

const one = <T,>(value: T | T[] | null): T | null => Array.isArray(value) ? value[0] ?? null : value;

export default function DriverDashboard() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [driver, setDriver] = useState<Driver | null>(null);
  const [tripDate, setTripDate] = useState(() => typeof window === 'undefined' ? '' : getPakistanDate());
  const [trips, setTrips] = useState<Trip[]>([]);
  const [students, setStudents] = useState<Record<string, Student>>({});
  const [loading, setLoading] = useState(true);
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadTrips = useCallback(async (driverId: string, date: string) => {
    setError('');
    const { data, error: tripsError } = await supabase
      .from('daily_assignments')
      .select('student_id, assignment_date, driver_name, driver_contact, attendance_status, coasters(coaster_number)')
      .eq('driver_id', driverId)
      .eq('assignment_date', date)
      .order('student_id');
    if (tripsError) {
      setError(`Could not load assigned trips: ${tripsError.message}`);
      setTrips([]);
      return;
    }
    const tripRows = (data ?? []) as unknown as Trip[];
    setTrips(tripRows);
    if (tripRows.length === 0) {
      setStudents({});
      return;
    }
    const ids = tripRows.map((trip) => trip.student_id);
    const { data: profileRows, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, cnic_last4, institution')
      .in('id', ids);
    if (profilesError) {
      setError(`Could not load student names: ${profilesError.message}`);
      return;
    }
    setStudents(Object.fromEntries((profileRows ?? []).map((profile) => [profile.id, profile as Student])));
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/driver/login'); return; }
      const { data: driverData } = await supabase.from('drivers').select('id, full_name').eq('id', session.user.id).eq('active', true).maybeSingle();
      if (!driverData) { await supabase.auth.signOut(); router.replace('/driver/login'); return; }
      if (cancelled) return;
      setDriver(driverData as Driver);
      await loadTrips(driverData.id, tripDate || getPakistanDate());
      if (!cancelled) setLoading(false);
    };
    void init();
    return () => { cancelled = true; };
  }, [loadTrips, router, supabase, tripDate]);

  const updateAttendance = async (studentId: string, status: 'present' | 'absent') => {
    if (!driver) return;
    setSavingStudentId(studentId);
    setError('');
    const { error: updateError } = await supabase
      .from('daily_assignments')
      .update({ attendance_status: status })
      .eq('student_id', studentId)
      .eq('driver_id', driver.id)
      .eq('assignment_date', tripDate);
    if (updateError) setError(`Could not save attendance: ${updateError.message}`);
    else setTrips((current) => current.map((trip) => trip.student_id === studentId ? { ...trip, attendance_status: status } : trip));
    setSavingStudentId(null);
  };

  const presentCount = trips.filter((trip) => trip.attendance_status === 'present').length;
  const absentCount = trips.filter((trip) => trip.attendance_status === 'absent').length;
  const pendingCount = trips.filter((trip) => trip.attendance_status === null).length;
  const vehicleNumber = trips.length ? one(trips[0].coasters)?.coaster_number : null;

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#080b10] text-zinc-300"><div className="rounded-2xl border border-white/[0.08] bg-[#10151d] px-6 py-5 text-sm">Loading your trips…</div></main>;

  return <div className="relative min-h-screen overflow-x-clip bg-[#080b10] text-white">
    <div className="pointer-events-none absolute inset-0"><div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-yellow-400/[0.06] blur-3xl" /></div>
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#0b0f14]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl border border-yellow-400/20 bg-gradient-to-br from-yellow-300/20 to-yellow-500/10 text-[11px] font-black tracking-[0.12em] text-yellow-200">EE</div><div><p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-white">Eagle Elites</p><p className="mt-0.5 text-[10px] font-medium tracking-wide text-zinc-500">Driver portal</p></div></div>
        <button type="button" onClick={async () => { await supabase.auth.signOut(); router.replace('/driver/login'); }} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/15 hover:bg-white/[0.06] hover:text-white">Log out</button>
      </div>
    </header>

    <main className="relative z-10 mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6 sm:py-8">
      <section className="relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[radial-gradient(ellipse_at_85%_0%,rgba(250,204,21,0.12),transparent_35%),linear-gradient(135deg,#151a22_0%,#0e131a_64%,#0b1016_100%)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.2)] sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full border border-yellow-300/[0.08]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-yellow-200/75">Trip operations</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">Welcome, {driver?.full_name?.split(' ')[0] || 'driver'}</h1><p className="mt-2 text-sm text-zinc-400">Your assigned roster and attendance for the selected trip.</p></div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-3 py-1.5 text-xs font-semibold text-emerald-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />Driver account active</span>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Assigned', value: trips.length, tone: 'text-white' },
          { label: 'Present', value: presentCount, tone: 'text-emerald-200' },
          { label: 'Absent', value: absentCount, tone: 'text-red-200' },
          { label: 'To mark', value: pendingCount, tone: pendingCount ? 'text-amber-100' : 'text-zinc-300' },
        ].map((stat) => <div key={stat.label} className="rounded-2xl border border-white/[0.08] bg-[#10151d]/90 p-4 sm:rounded-[22px]"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{stat.label}</p><p className={`mt-3 text-2xl font-semibold tracking-tight ${stat.tone}`}>{stat.value}</p></div>)}
      </div>

      <section className="rounded-[26px] border border-white/[0.08] bg-[#10151d] p-5 shadow-[0_18px_42px_rgba(0,0,0,0.14)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-yellow-200/70">Daily roster</p><h2 className="mt-1 text-lg font-semibold text-white">Trip attendance</h2><p className="mt-1 text-sm text-zinc-400">Mark each assigned student as they board.</p></div>
          <label className="text-xs font-medium text-zinc-400">Trip date<input aria-label="Trip date" type="date" value={tripDate} onChange={(event) => setTripDate(event.target.value)} className="mt-1.5 block min-h-10 rounded-xl border border-white/[0.09] bg-[#0b1016] px-3 py-2 text-sm text-white outline-none transition focus:border-yellow-300/40" /></label>
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/15 bg-red-400/[0.07] px-4 py-3 text-sm text-red-200">{error}</p>}

        {trips.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-[#0b1016] px-5 py-12 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-lg text-yellow-200" aria-hidden="true">◷</span><p className="mt-4 font-semibold text-zinc-200">No trip assigned for this date</p><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-zinc-500">Choose another trip date or contact the transport administrator if you expected a roster.</p></div> : <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-[#0b1016] px-4 py-3"><div><p className="text-xs font-medium text-zinc-300">{trips.length} assigned {trips.length === 1 ? 'student' : 'students'}</p><p className="mt-1 text-[11px] text-zinc-500">{tripDate}{vehicleNumber ? ` · Vehicle ${vehicleNumber}` : ''}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${pendingCount ? 'border border-amber-300/15 bg-amber-300/[0.07] text-amber-100' : 'border border-emerald-300/15 bg-emerald-300/[0.07] text-emerald-100'}`}>{pendingCount ? `${pendingCount} still to mark` : 'Roster complete'}</span></div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">{trips.map((trip, index) => {
            const student = students[trip.student_id];
            const coaster = one(trip.coasters)?.coaster_number;
            const saving = savingStudentId === trip.student_id;
            return <article key={trip.student_id} className="rounded-2xl border border-white/[0.08] bg-[#0b1016] p-4 transition hover:border-white/[0.13] sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-yellow-300/15 bg-yellow-300/[0.07] text-sm font-semibold text-yellow-100">{String(index + 1).padStart(2, '0')}</span>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate font-semibold text-white">{student?.full_name ?? 'Student'}</h3><p className="mt-1 truncate text-xs text-zinc-400">{student?.institution || 'Institution not listed'}{student?.cnic_last4 ? ` · ${student.cnic_last4}` : ''}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${trip.attendance_status === 'present' ? 'border border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-100' : trip.attendance_status === 'absent' ? 'border border-red-400/15 bg-red-400/[0.07] text-red-100' : 'border border-white/[0.08] bg-white/[0.04] text-zinc-400'}`}>{trip.attendance_status === 'present' ? 'Boarded' : trip.attendance_status === 'absent' ? 'Absent' : 'Not marked'}</span></div><p className="mt-2 text-[11px] text-zinc-500">{coaster ? `Vehicle ${coaster}` : 'Vehicle not listed'}</p></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" aria-pressed={trip.attendance_status === 'present'} disabled={saving} onClick={() => void updateAttendance(trip.student_id, 'present')} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:opacity-50 ${trip.attendance_status === 'present' ? 'border-emerald-300/30 bg-emerald-300 text-[#092116]' : 'border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-100 hover:bg-emerald-300/[0.12]'}`}>{saving ? 'Saving…' : trip.attendance_status === 'present' ? '✓ Present' : 'Mark present'}</button>
                <button type="button" aria-pressed={trip.attendance_status === 'absent'} disabled={saving} onClick={() => void updateAttendance(trip.student_id, 'absent')} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:opacity-50 ${trip.attendance_status === 'absent' ? 'border-red-300/30 bg-red-300 text-[#2a0e0e]' : 'border-red-300/15 bg-red-300/[0.06] text-red-100 hover:bg-red-300/[0.12]'}`}>{saving ? 'Saving…' : trip.attendance_status === 'absent' ? '✓ Absent' : 'Mark absent'}</button>
              </div>
            </article>;
          })}</div>
        </>}
      </section>
      <p className="pb-3 text-center text-xs text-zinc-600">Need account help? Contact the transport administrator.</p>
    </main>
  </div>;
}
