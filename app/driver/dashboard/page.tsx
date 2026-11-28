'use client';

import BrandLoader from '@/components/ui/brand-loader';
import Logo from '@/components/brand/logo';
import Icon, { IconTile } from '@/components/ui/icons';
import TripControls, { type TripEvent } from '@/components/driver/trip-controls';
import VehicleCheckCard, { type VehicleCheck } from '@/components/driver/vehicle-check';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getPakistanDate, getPakistanTime } from '@/lib/date/pakistan';
import { driverApi, isOfflineError } from '@/lib/driver/api';
import { enqueue, flushQueue, parseQueue, QUEUE_KEY, stampMark, type QueuedMark } from '@/lib/ops/offline-queue';
import type { TripLeg } from '@/lib/ops/trip-messages';

type Driver = { id: string; full_name: string; usual_vehicle_id: string | null };
type Trip = { student_id: string; assignment_date: string; coaster_id: string | null; attendance_status: 'present' | 'absent' | null; coasters: { coaster_number: string } | { coaster_number: string }[] | null };
type Stop = { student_id: string; full_name: string; institution: string | null; cnic_last4: string | null; pickup_point: string | null; morning_time: string | null; evening_time: string | null };

const one = <T,>(value: T | T[] | null): T | null => (Array.isArray(value) ? value[0] ?? null : value);
const missing = (message?: string) => /does not exist|schema cache|could not find the function/i.test(message ?? '');
const hhmm = (value: string | null) => (value ? value.slice(0, 5) : null);

function readQueue(): QueuedMark[] {
  try {
    return parseQueue(localStorage.getItem(QUEUE_KEY));
  } catch {
    return [];
  }
}
function writeQueue(queue: QueuedMark[]) {
  try {
    if (queue.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    else localStorage.removeItem(QUEUE_KEY);
  } catch {
    // Private mode: marks are still kept in memory for this visit.
  }
}

export default function DriverDashboard() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [driver, setDriver] = useState<Driver | null>(null);
  const [today] = useState(() => (typeof window === 'undefined' ? '' : getPakistanDate()));
  const [tripDate, setTripDate] = useState(today);
  const [leg, setLeg] = useState<TripLeg>(() => (typeof window !== 'undefined' && getPakistanTime() >= '12:00' ? 'evening' : 'morning'));
  const [trips, setTrips] = useState<Trip[]>([]);
  const [stops, setStops] = useState<Record<string, Stop>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [events, setEvents] = useState<TripEvent[]>([]);
  const [tripUpdatesReady, setTripUpdatesReady] = useState(true);
  const [check, setCheck] = useState<VehicleCheck | null>(null);
  const [checkReady, setCheckReady] = useState(true);
  const [queue, setQueue] = useState<QueuedMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [hereSent, setHereSent] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const isToday = tripDate === today;

  const loadEvents = useCallback(async (driverId: string) => {
    const { data, error: eventsError } = await supabase
      .from('trip_events')
      .select('id, leg, kind, problem_type, created_at, riders_notified')
      .eq('driver_id', driverId)
      .eq('trip_date', getPakistanDate())
      .order('created_at', { ascending: false });
    if (eventsError) {
      setTripUpdatesReady(!missing(eventsError.message));
      return;
    }
    setEvents((data ?? []) as TripEvent[]);
  }, [supabase]);

  const loadTrips = useCallback(async (driverId: string, date: string) => {
    setError('');
    const { data, error: tripsError } = await supabase
      .from('daily_assignments')
      .select('student_id, assignment_date, coaster_id, attendance_status, coasters(coaster_number)')
      .eq('driver_id', driverId)
      .eq('assignment_date', date);
    if (tripsError) {
      setError(isOfflineError(tripsError.message) ? 'No connection. Showing nothing until you have signal.' : `Could not load assigned trips: ${tripsError.message}`);
      setTrips([]);
      return;
    }
    const pending = readQueue().filter((mark) => mark.date === date);
    const tripRows = ((data ?? []) as unknown as Trip[]).map((trip) => {
      const queued = pending.find((mark) => mark.student_id === trip.student_id);
      return queued ? { ...trip, attendance_status: queued.status } : trip;
    });
    setTrips(tripRows);
    if (tripRows.length === 0) {
      setStops({});
      setOrder([]);
      return;
    }
    // Pickup order with stops and times (migration 20261127030000), then the
    // name-only roster, then a plain profile read for older databases.
    const stopsRes = await supabase.rpc('driver_trip_stops', { p_date: date });
    if (!stopsRes.error) {
      const rows = (stopsRes.data ?? []) as Stop[];
      setStops(Object.fromEntries(rows.map((row) => [row.student_id, row])));
      setOrder(rows.map((row) => row.student_id));
      return;
    }
    const rosterRes = await supabase.rpc('driver_trip_roster', { p_date: date });
    let rows: Stop[] = [];
    if (!rosterRes.error) {
      rows = ((rosterRes.data ?? []) as Stop[]).map((row) => ({ ...row, pickup_point: null, morning_time: null, evening_time: null }));
    } else {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, cnic_last4, institution')
        .in('id', tripRows.map((trip) => trip.student_id));
      if (profilesError) setError(`Could not load student names: ${profilesError.message}`);
      rows = (profiles ?? []).map((p) => ({ student_id: p.id, full_name: p.full_name, institution: p.institution, cnic_last4: p.cnic_last4, pickup_point: null, morning_time: null, evening_time: null }));
    }
    rows.sort((a, b) => a.full_name.localeCompare(b.full_name));
    setStops(Object.fromEntries(rows.map((row) => [row.student_id, row])));
    setOrder(rows.map((row) => row.student_id));
  }, [supabase]);

  const sendMark = useCallback(async (driverId: string, mark: QueuedMark) => {
    const { error: updateError } = await supabase
      .from('daily_assignments')
      .update({ attendance_status: mark.status })
      .eq('student_id', mark.student_id)
      .eq('driver_id', driverId)
      .eq('assignment_date', mark.date);
    // Lost signal: keep it for later. A real refusal is dropped (shown below).
    if (updateError && isOfflineError(updateError.message)) return false;
    if (updateError) setError(`Could not save attendance: ${updateError.message}`);
    return true;
  }, [supabase]);

  const flush = useCallback(async (driverId: string) => {
    const pending = readQueue();
    if (!pending.length) return;
    const left = await flushQueue(pending, (mark) => sendMark(driverId, mark));
    writeQueue(left);
    setQueue(left);
  }, [sendMark]);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/driver/login'); return; }
      const { data: driverData } = await supabase.from('drivers').select('id, full_name, usual_vehicle_id').eq('id', session.user.id).eq('active', true).maybeSingle();
      if (!driverData) { await supabase.auth.signOut(); router.replace('/driver/login'); return; }
      if (cancelled) return;
      setDriver(driverData as Driver);
      setQueue(readQueue());
      const date = tripDate || getPakistanDate();
      await Promise.all([
        loadTrips(driverData.id, date),
        loadEvents(driverData.id),
        supabase.from('vehicle_checks').select('fuel_ok, tyres_ok, lights_ok, brakes_ok, mirrors_horn_ok, all_ok, notes').eq('driver_id', driverData.id).eq('check_date', getPakistanDate()).maybeSingle()
          .then(({ data, error: checkError }) => {
            if (checkError) setCheckReady(!missing(checkError.message));
            else setCheck((data as VehicleCheck | null) ?? null);
          }),
      ]);
      if (!cancelled) setLoading(false);
    };
    void init();
    return () => { cancelled = true; };
  }, [loadEvents, loadTrips, router, supabase, tripDate]);

  useEffect(() => {
    if (!driver) return;
    const onOnline = () => void flush(driver.id).then(() => loadTrips(driver.id, tripDate));
    window.addEventListener('online', onOnline);
    // Send anything left over from an earlier visit without signal.
    const timer = window.setTimeout(() => void flush(driver.id), 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('online', onOnline);
    };
  }, [driver, flush, loadTrips, tripDate]);

  const updateAttendance = async (studentId: string, status: 'present' | 'absent') => {
    if (!driver) return;
    setSavingStudentId(studentId);
    setError('');
    const mark = stampMark({ student_id: studentId, date: tripDate, status });
    setTrips((current) => current.map((trip) => (trip.student_id === studentId ? { ...trip, attendance_status: status } : trip)));
    const delivered = await sendMark(driver.id, mark);
    if (!delivered) {
      const next = enqueue(readQueue(), mark);
      writeQueue(next);
      setQueue(next);
    }
    setSavingStudentId(null);
  };

  const sayHere = async (studentId: string) => {
    setHereSent((current) => ({ ...current, [studentId]: 'Sending…' }));
    const result = await driverApi('/api/driver/notify-student', { studentId, leg });
    setHereSent((current) => ({
      ...current,
      [studentId]: result.ok ? (result.sent ? 'Student told on WhatsApp' : result.reason ?? 'Not sent') : result.error ?? 'Could not send',
    }));
  };

  const presentCount = trips.filter((trip) => trip.attendance_status === 'present').length;
  const absentCount = trips.filter((trip) => trip.attendance_status === 'absent').length;
  const pendingCount = trips.filter((trip) => trip.attendance_status === null).length;
  const vehicleNumber = trips.length ? one(trips[0].coasters)?.coaster_number ?? null : null;
  const ordered = [...trips].sort((a, b) => {
    const ia = order.indexOf(a.student_id);
    const ib = order.indexOf(b.student_id);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });
  const queuedToday = queue.filter((mark) => mark.date === tripDate).length;

  if (loading) return <BrandLoader label="Loading your trips" />;

  return <div className="relative min-h-screen overflow-x-clip bg-[#080b10] text-white">
    <div className="pointer-events-none absolute inset-0"><div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-yellow-400/[0.06] blur-3xl" /></div>
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#0b0f14]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Logo size={38} subtitle="Driver portal" />
        <button type="button" onClick={async () => { await supabase.auth.signOut(); router.replace('/driver/login'); }} aria-label="Log out" className="ee-btn ee-btn-secondary min-h-10 gap-2 px-3 text-xs"><Icon name="logout" size={16} /><span className="hidden sm:inline">Log out</span></button>
      </div>
    </header>

    <main className="ee-enter relative z-10 mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6 sm:py-8">
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.09] bg-[radial-gradient(ellipse_at_85%_0%,rgba(232,187,64,0.12),transparent_35%),linear-gradient(135deg,#151a22_0%,#0e131a_64%,#0b1016_100%)] p-5 sm:p-7">
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-yellow-200/75">Trip operations</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">Welcome, {driver?.full_name?.split(' ')[0] || 'driver'}</h1><p className="mt-2 text-sm text-zinc-400">{isToday && vehicleNumber ? `Today: ${vehicleNumber} · ${trips.length} rider${trips.length === 1 ? '' : 's'}` : 'Your roster and attendance for the selected day.'}</p></div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-3 py-1.5 text-xs font-semibold text-emerald-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />Driver account active</span>
        </div>
      </section>

      {isToday && trips.length > 0 && driver && (
        <>
          {checkReady && (
            <VehicleCheckCard
              supabase={supabase}
              driverId={driver.id}
              coasterId={trips[0].coaster_id ?? driver.usual_vehicle_id}
              vehicleNumber={vehicleNumber}
              date={today}
              existing={check}
              onSaved={setCheck}
            />
          )}
          <TripControls leg={leg} onLegChange={setLeg} events={events} onSent={() => void loadEvents(driver.id)} available={tripUpdatesReady} />
        </>
      )}

      <div className="ee-stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Assigned', value: trips.length, tone: 'text-white', icon: 'users' as const, tile: 'neutral' as const },
          { label: 'Present', value: presentCount, tone: 'text-emerald-200', icon: 'check' as const, tile: 'green' as const },
          { label: 'Absent', value: absentCount, tone: 'text-red-200', icon: 'user' as const, tile: 'red' as const },
          { label: 'To mark', value: pendingCount, tone: pendingCount ? 'text-amber-100' : 'text-zinc-300', icon: 'clipboard' as const, tile: 'gold' as const },
        ].map((stat) => <div key={stat.label} className="rounded-2xl border border-white/[0.08] bg-[#10151d]/90 p-4 sm:rounded-3xl"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{stat.label}</p><IconTile name={stat.icon} tone={stat.tile} className="h-8 w-8" /></div><p className={`mt-3 text-2xl font-semibold tracking-tight ${stat.tone}`}>{stat.value}</p></div>)}
      </div>

      <section className="rounded-3xl border border-white/[0.08] bg-[#10151d] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-yellow-200/70">Daily roster</p><h2 className="mt-1 text-lg font-semibold text-white">Riders in pickup order</h2><p className="mt-1 text-sm text-zinc-400">Mark each student as they board. Works without signal too.</p></div>
          <label className="text-xs font-medium text-zinc-400">Trip date<input aria-label="Trip date" type="date" value={tripDate} onChange={(event) => setTripDate(event.target.value)} className="mt-1.5 block min-h-10 rounded-xl border border-white/[0.09] bg-[#0b1016] px-3 py-2 text-sm text-white outline-none transition focus:border-yellow-300/40" /></label>
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/15 bg-red-400/[0.07] px-4 py-3 text-sm text-red-200">{error}</p>}
        {queuedToday > 0 && <p role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-sm text-amber-100"><Icon name="clock" size={16} />{queuedToday} mark{queuedToday === 1 ? '' : 's'} saved on this phone. They&apos;ll send when you have signal.</p>}

        {trips.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-[#0b1016] px-5 py-12 text-center"><IconTile name="clock" className="mx-auto h-11 w-11" /><p className="mt-4 font-semibold text-zinc-200">No trip assigned for this date</p><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-zinc-500">Choose another trip date or contact the transport administrator if you expected a roster.</p></div> : <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-[#0b1016] px-4 py-3"><div><p className="text-xs font-medium text-zinc-300">{trips.length} assigned {trips.length === 1 ? 'student' : 'students'}</p><p className="mt-1 text-[11px] text-zinc-500">{tripDate}{vehicleNumber ? ` · Vehicle ${vehicleNumber}` : ''}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${pendingCount ? 'border border-amber-300/15 bg-amber-300/[0.07] text-amber-100' : 'border border-emerald-300/15 bg-emerald-300/[0.07] text-emerald-100'}`}>{pendingCount ? `${pendingCount} still to mark` : 'Roster complete'}</span><div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-label="Roster marked" aria-valuemin={0} aria-valuemax={trips.length} aria-valuenow={trips.length - pendingCount}><div className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-yellow-300 transition-[width] duration-500" style={{ width: `${((trips.length - pendingCount) / trips.length) * 100}%` }} /></div></div>
          <ol className="ee-stagger mt-3 grid gap-3 md:grid-cols-2">{ordered.map((trip, index) => {
            const student = stops[trip.student_id];
            const saving = savingStudentId === trip.student_id;
            const time = hhmm(leg === 'evening' ? student?.evening_time ?? null : student?.morning_time ?? null);
            return <li key={trip.student_id} className="rounded-2xl border border-white/[0.08] bg-[#0b1016] p-4 transition hover:border-white/[0.13] sm:p-5">
              <div className="flex items-start gap-3">
                <span className="ee-mono flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-yellow-300/15 bg-yellow-300/[0.07] text-sm text-yellow-100">{String(index + 1).padStart(2, '0')}</span>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate font-semibold text-white">{student?.full_name ?? 'Student'}</h3><p className="mt-1 truncate text-xs text-zinc-400">{student?.institution || 'Institution not listed'}{student?.cnic_last4 ? ` · ${student.cnic_last4}` : ''}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${trip.attendance_status === 'present' ? 'border border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-100' : trip.attendance_status === 'absent' ? 'border border-red-400/15 bg-red-400/[0.07] text-red-100' : 'border border-white/[0.08] bg-white/[0.04] text-zinc-400'}`}>{trip.attendance_status === 'present' ? 'Boarded' : trip.attendance_status === 'absent' ? 'Absent' : 'Not marked'}</span></div>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-400"><span className="inline-flex items-center gap-1"><Icon name="pin" size={12} />{student?.pickup_point ?? 'Pickup not set'}</span>{time && <span className="ee-mono inline-flex items-center gap-1"><Icon name="clock" size={12} />{time}</span>}</p></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" aria-pressed={trip.attendance_status === 'present'} disabled={saving} onClick={() => void updateAttendance(trip.student_id, 'present')} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:opacity-50 ${trip.attendance_status === 'present' ? 'border-emerald-300/30 bg-emerald-300 text-[#092116]' : 'border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-100 hover:bg-emerald-300/[0.12]'}`}>{saving ? 'Saving…' : trip.attendance_status === 'present' ? 'Present ✓' : 'Mark present'}</button>
                <button type="button" aria-pressed={trip.attendance_status === 'absent'} disabled={saving} onClick={() => void updateAttendance(trip.student_id, 'absent')} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:opacity-50 ${trip.attendance_status === 'absent' ? 'border-red-300/30 bg-red-300 text-[#2a0e0e]' : 'border-red-300/15 bg-red-300/[0.06] text-red-100 hover:bg-red-300/[0.12]'}`}>{saving ? 'Saving…' : trip.attendance_status === 'absent' ? 'Absent ✓' : 'Mark absent'}</button>
              </div>
              {isToday && trip.attendance_status !== 'absent' && tripUpdatesReady && (
                <div className="mt-2 flex items-center gap-3">
                  <button type="button" disabled={Boolean(hereSent[trip.student_id])} onClick={() => void sayHere(trip.student_id)} className="ee-btn ee-btn-ghost min-h-10 px-3 text-sm text-[#7fe3a7]">
                    <Icon name="whatsapp" size={16} /> I&apos;m here
                  </button>
                  {hereSent[trip.student_id] && <span role="status" className="text-xs text-zinc-400">{hereSent[trip.student_id]}</span>}
                </div>
              )}
            </li>;
          })}</ol>
        </>}
      </section>
      <p className="pb-3 text-center text-xs text-zinc-600">Need account help? Contact the transport administrator.</p>
    </main>
  </div>;
}
