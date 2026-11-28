/** Wording for driver trip updates sent to riders (announcement template: title + message). */
export type TripLeg = 'morning' | 'evening';
export type TripKind = 'on_the_way' | 'arriving' | 'arrived' | 'problem';
export type ProblemType = 'breakdown' | 'traffic' | 'accident' | 'other';

export const TRIP_LEGS: TripLeg[] = ['morning', 'evening'];
export const TRIP_KINDS: TripKind[] = ['on_the_way', 'arriving', 'arrived', 'problem'];
export const PROBLEM_TYPES: ProblemType[] = ['breakdown', 'traffic', 'accident', 'other'];

export const PROBLEM_LABELS: Record<ProblemType, string> = {
  breakdown: 'Vehicle breakdown',
  traffic: 'Heavy traffic',
  accident: 'Accident',
  other: 'Other problem',
};

export const STATUS_LABELS: Record<TripLeg, Record<Exclude<TripKind, 'problem'>, string>> = {
  morning: { on_the_way: 'Left for pickups', arriving: 'Arriving in 10 min', arrived: 'Reached campus' },
  evening: { on_the_way: 'Left campus', arriving: 'Arriving at campus in 10 min', arrived: 'Last drop-off done' },
};

/** Message for riders, or null when this update isn't worth a WhatsApp. */
export function tripMessage(
  leg: TripLeg,
  kind: TripKind,
  vehicle: string | null,
  problem?: ProblemType | null,
): { title: string; message: string } | null {
  const van = vehicle ? `Vehicle ${vehicle}` : 'Your vehicle';
  if (kind === 'problem') {
    const reason = problem === 'traffic' ? 'heavy traffic' : problem === 'breakdown' ? 'a vehicle problem' : 'an issue on the road';
    return { title: 'Your ride is delayed', message: `${van} is delayed because of ${reason}. We will update you soon. Sorry for the wait.` };
  }
  if (leg === 'morning' && kind === 'on_the_way') return { title: 'Your ride is on the way', message: `${van} has left for pickups. Please be ready at your stop.` };
  if (leg === 'morning' && kind === 'arriving') return { title: 'Your ride is 10 minutes away', message: `${van} will reach your pickup point in about 10 minutes.` };
  if (leg === 'evening' && kind === 'on_the_way') return { title: 'Return trip started', message: `${van} has left campus on the return trip.` };
  if (leg === 'evening' && kind === 'arriving') return { title: 'Return pickup in 10 minutes', message: `${van} will reach campus for the return trip in about 10 minutes.` };
  return null; // "arrived": a record for admins only.
}

export function hereMessage(vehicle: string | null) {
  return { title: 'Your ride is here', message: `${vehicle ? `Vehicle ${vehicle}` : 'Your vehicle'} is at your pickup point now.` };
}
