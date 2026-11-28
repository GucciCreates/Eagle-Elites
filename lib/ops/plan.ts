/**
 * Tomorrow's plan: who rides, in which vehicle, with which driver.
 * Pure function so the same rules run for the admin preview, the publish
 * button and the evening auto-publish, and can be unit tested.
 *
 * Rules
 *  - Riders: active students on a route who set a trip for that weekday in
 *    their weekly schedule, minus anyone who marked the day "not riding".
 *  - Students who already have a trip that day keep it (an admin's manual
 *    choice is never overwritten).
 *  - Vehicles: the route's usual vehicles that are active (not in
 *    maintenance or retired), largest first, each with the driver whose
 *    usual vehicle it is. Seats already taken that day count.
 *  - Nothing is planned on a holiday.
 */

export type PlanStudent = { id: string; full_name: string | null; route_id: string | null; status: string | null };
export type PlanRoute = { id: string; name: string };
export type PlanCoaster = {
  id: string;
  coaster_number: string;
  seat_capacity: number | null;
  default_route_id: string | null;
  maintenance_status: string | null;
};
export type PlanDriver = { id: string; full_name: string; phone: string | null; usual_vehicle_id: string | null; active: boolean };
export type ExistingTrip = { student_id: string; coaster_id: string | null };

export type PlanInput = {
  date: string;
  holiday: string | null;
  students: PlanStudent[];
  routes: PlanRoute[];
  scheduledIds: Iterable<string>;
  skippedIds: Iterable<string>;
  existing: ExistingTrip[];
  coasters: PlanCoaster[];
  drivers: PlanDriver[];
};

export type PlanRow = {
  student_id: string;
  route_id: string;
  coaster_id: string;
  driver_id: string;
  driver_name: string;
  driver_contact: string;
  assignment_date: string;
  seat_confirmed: false;
};

export type PlanVehicle = { coaster_id: string; coaster_number: string; driver_name: string; seats: number; taken: number; added: number };

export type RoutePlan = {
  route_id: string;
  route_name: string;
  vehicles: PlanVehicle[];
  riders: number;
  alreadyAssigned: number;
  skipped: number;
  unplaced: string[];
  notScheduled: number;
  warnings: string[];
};

export type Plan = { date: string; holiday: string | null; rows: PlanRow[]; routes: RoutePlan[] };

const DEFAULT_SEATS = 28;

export function buildPlan(input: PlanInput): Plan {
  if (input.holiday) return { date: input.date, holiday: input.holiday, rows: [], routes: [] };

  const scheduled = new Set(input.scheduledIds);
  const skipped = new Set(input.skippedIds);
  const assigned = new Set(input.existing.map((trip) => trip.student_id));
  const takenByCoaster = new Map<string, number>();
  for (const trip of input.existing) {
    if (trip.coaster_id) takenByCoaster.set(trip.coaster_id, (takenByCoaster.get(trip.coaster_id) ?? 0) + 1);
  }
  const driverFor = new Map(input.drivers.filter((d) => d.active && d.usual_vehicle_id).map((d) => [d.usual_vehicle_id!, d]));
  const usedDrivers = new Set<string>();

  const rows: PlanRow[] = [];
  const routes: RoutePlan[] = [];

  for (const route of input.routes) {
    const onRoute = input.students.filter((s) => s.route_id === route.id && s.status === 'active');
    if (onRoute.length === 0) continue;
    const warnings: string[] = [];
    const riders = onRoute
      .filter((s) => scheduled.has(s.id) && !skipped.has(s.id) && !assigned.has(s.id))
      .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''));

    const vehicles: (PlanVehicle & { driver: PlanDriver })[] = [];
    const candidates = input.coasters
      .filter((c) => c.default_route_id === route.id && (c.maintenance_status ?? 'active') === 'active')
      .sort((a, b) => (b.seat_capacity ?? DEFAULT_SEATS) - (a.seat_capacity ?? DEFAULT_SEATS));
    for (const coaster of candidates) {
      const driver = driverFor.get(coaster.id);
      if (!driver || usedDrivers.has(driver.id)) {
        warnings.push(`${coaster.coaster_number} has no available driver.`);
        continue;
      }
      usedDrivers.add(driver.id);
      vehicles.push({
        coaster_id: coaster.id,
        coaster_number: coaster.coaster_number,
        driver_name: driver.full_name,
        seats: coaster.seat_capacity ?? DEFAULT_SEATS,
        taken: takenByCoaster.get(coaster.id) ?? 0,
        added: 0,
        driver,
      });
    }
    if (candidates.length === 0) warnings.push('No usual vehicle is set for this route.');

    const unplaced: string[] = [];
    for (const rider of riders) {
      const vehicle = vehicles.find((v) => v.taken + v.added < v.seats);
      if (!vehicle) {
        unplaced.push(rider.full_name ?? 'Student');
        continue;
      }
      vehicle.added += 1;
      rows.push({
        student_id: rider.id,
        route_id: route.id,
        coaster_id: vehicle.coaster_id,
        driver_id: vehicle.driver.id,
        driver_name: vehicle.driver.full_name,
        driver_contact: vehicle.driver.phone ?? '',
        assignment_date: input.date,
        seat_confirmed: false,
      });
    }
    if (unplaced.length && vehicles.length) warnings.push(`${unplaced.length} rider${unplaced.length === 1 ? '' : 's'} over capacity.`);

    routes.push({
      route_id: route.id,
      route_name: route.name,
      vehicles: vehicles.map((v) => ({ coaster_id: v.coaster_id, coaster_number: v.coaster_number, driver_name: v.driver_name, seats: v.seats, taken: v.taken, added: v.added })),
      riders: riders.length,
      alreadyAssigned: onRoute.filter((s) => assigned.has(s.id)).length,
      skipped: onRoute.filter((s) => skipped.has(s.id)).length,
      unplaced,
      notScheduled: onRoute.filter((s) => !scheduled.has(s.id) && !assigned.has(s.id)).length,
      warnings,
    });
  }

  return { date: input.date, holiday: null, rows, routes };
}
