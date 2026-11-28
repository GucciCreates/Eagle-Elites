/**
 * The admin's morning checklist: the things worth a look before the first
 * van leaves. Pure, so it can be unit tested; the caller passes "now".
 */

export type ChecklistInput = {
  today: string;
  holidayToday: string | null;
  students: { id: string; status?: string | null; route_id: string | null }[];
  todayTrips: { student_id: string; coaster_id: string | null; seat_confirmed: boolean }[];
  coasters: { id: string; coaster_number: string; seat_capacity?: number | null; maintenance_status?: string | null }[];
  drivers: { id: string; full_name: string; active: boolean; usual_vehicle_id?: string | null }[];
  applications: { id: string; applied_at?: string | null }[];
  problems: { id: string; resolved_at: string | null }[];
  failedChecks: number;
  nowMs: number;
};

export type ChecklistItem = {
  key: string;
  label: string;
  count: number;
  tone: 'urgent' | 'warn';
  tab: string;
  detail?: string;
};

export const APPLICATION_WAIT_HOURS = 48;

export function buildChecklist(input: ChecklistInput): ChecklistItem[] {
  const onTrip = new Set(input.todayTrips.map((trip) => trip.student_id));
  const items: ChecklistItem[] = [];
  const add = (item: ChecklistItem) => item.count > 0 && items.push(item);

  const openProblems = input.problems.filter((problem) => !problem.resolved_at).length;
  add({ key: 'problems', label: 'Problems reported by drivers today', count: openProblems, tone: 'urgent', tab: 'overview' });
  add({ key: 'checks', label: 'Vehicle checks with a problem today', count: input.failedChecks, tone: 'urgent', tab: 'vehicles' });

  const seatsBy = new Map<string, number>();
  for (const trip of input.todayTrips) if (trip.coaster_id) seatsBy.set(trip.coaster_id, (seatsBy.get(trip.coaster_id) ?? 0) + 1);
  const overfull = input.coasters.filter((coaster) => (seatsBy.get(coaster.id) ?? 0) > (coaster.seat_capacity ?? Infinity));
  add({
    key: 'overfull',
    label: 'Vehicles with more riders than seats today',
    count: overfull.length,
    tone: 'urgent',
    tab: 'assignments',
    detail: overfull.map((coaster) => `${coaster.coaster_number} (${seatsBy.get(coaster.id)}/${coaster.seat_capacity})`).join(', '),
  });

  if (!input.holidayToday) {
    const noTrip = input.students.filter((student) => student.status === 'active' && student.route_id && !onTrip.has(student.id)).length;
    add({ key: 'no-trip', label: 'Active students with no trip today', count: noTrip, tone: 'warn', tab: 'assignments' });
    add({
      key: 'unconfirmed',
      label: 'Trips today with the seat not confirmed',
      count: input.todayTrips.filter((trip) => !trip.seat_confirmed).length,
      tone: 'warn',
      tab: 'assignments',
    });
  }

  const inShop = input.coasters.filter((coaster) => coaster.maintenance_status === 'maintenance');
  add({ key: 'maintenance', label: 'Vehicles in maintenance', count: inShop.length, tone: 'warn', tab: 'vehicles', detail: inShop.map((c) => c.coaster_number).join(', ') });

  const parked = input.drivers.filter((driver) => driver.active && !driver.usual_vehicle_id);
  add({ key: 'drivers', label: 'Active drivers without a usual vehicle', count: parked.length, tone: 'warn', tab: 'drivers', detail: parked.map((d) => d.full_name).join(', ') });

  const cutoff = input.nowMs - APPLICATION_WAIT_HOURS * 3_600_000;
  const waiting = input.applications.filter((app) => app.applied_at && Date.parse(app.applied_at) < cutoff).length;
  add({ key: 'applications', label: `Applications waiting more than ${APPLICATION_WAIT_HOURS} hours`, count: waiting, tone: 'warn', tab: 'applications' });

  return items;
}
