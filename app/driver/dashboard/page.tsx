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

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#05070b] text-zinc-300">Loading your trips…</main>;

  return <main className="min-h-screen bg-[#05070b] px-4 py-6 text-white sm:px-6">
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/80 p-5">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-300">Eagle Elites · Driver</p><h1 className="mt-1 text-xl font-semibold">Hello, {driver?.full_name}</h1><p className="mt-1 text-sm text-zinc-400">Trips assigned to your driver account only.</p></div>
        <button type="button" onClick={async () => { await supabase.auth.signOut(); router.replace('/driver/login'); }} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">Log out</button>
      </header>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-lg font-semibold">Trip attendance</h2><p className="mt-1 text-sm text-zinc-400">Mark each assigned student present or absent.</p></div><label className="text-xs text-zinc-400">Trip date<input type="date" value={tripDate} onChange={(event) => setTripDate(event.target.value)} className="mt-1 block rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white" /></label></div>
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-sm text-red-200">{error}</p>}
        {trips.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-zinc-700 px-5 py-10 text-center"><p className="font-medium text-zinc-200">No trip assigned for this date</p><p className="mt-1 text-sm text-zinc-500">Ask the transport administrator to assign your driver account to a route.</p></div> : <div className="mt-5 space-y-3">{trips.map((trip) => { const student = students[trip.student_id]; const coaster = one(trip.coasters)?.coaster_number; return <article key={trip.student_id} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="font-semibold text-white">{student?.full_name ?? 'Student'}</h3><p className="mt-1 text-xs text-zinc-400">{student?.institution || 'Institution not listed'}{student?.cnic_last4 ? ` · ${student.cnic_last4}` : ''}</p><p className="mt-1 text-xs text-zinc-500">{coaster ? `Vehicle ${coaster}` : 'Vehicle not listed'}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${trip.attendance_status === 'present' ? 'bg-emerald-500/15 text-emerald-200' : trip.attendance_status === 'absent' ? 'bg-red-500/15 text-red-200' : 'bg-zinc-800 text-zinc-400'}`}>{trip.attendance_status ?? 'Not marked'}</span></div><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" disabled={savingStudentId === trip.student_id} onClick={() => void updateAttendance(trip.student_id, 'present')} className="rounded-xl bg-emerald-500/15 py-3 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50">Present</button><button type="button" disabled={savingStudentId === trip.student_id} onClick={() => void updateAttendance(trip.student_id, 'absent')} className="rounded-xl bg-red-500/15 py-3 text-sm font-semibold text-red-200 hover:bg-red-500/25 disabled:opacity-50">Absent</button></div></article>; })}</div>}
      </section>
      <p className="mt-4 text-center text-xs text-zinc-600">Need account help? Contact the transport administrator.</p>
    </div>
  </main>;
}
