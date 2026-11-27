/** Seat-availability label for a route; null when capacity isn't tracked. */
export function seatBadge(seatsLeft: number | null) {
  if (seatsLeft === null) return null;
  if (seatsLeft === 0)
    return { text: 'Full · join waitlist', tone: 'border-red-400/30 bg-red-500/10 text-red-200' };
  if (seatsLeft <= 5)
    return { text: `Only ${seatsLeft} seat${seatsLeft === 1 ? '' : 's'} left`, tone: 'border-amber-300/30 bg-amber-300/10 text-amber-100' };
  return { text: `${seatsLeft} seats open`, tone: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100' };
}
