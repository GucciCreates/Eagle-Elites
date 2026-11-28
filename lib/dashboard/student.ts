// Types and pure helpers for the rider dashboard (app/dashboard/page.tsx).
import { getPakistanWeekStart } from '@/lib/date/pakistan';
import { toHHMM } from '@/lib/time-options';

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  fee_status: string;
  institution?: string | null;
  route_id: string;
  status?: string;
  departure_group_id?: string | null;
  phone?: string | null;
  whatsapp_opt_in?: boolean | null;
};

export type DepartureGroup = {
  id: string;
  university: string;
  department: string;
};

export type DepartureSlot = {
  id: string;
  group_id: string;
  slot_date: string;
  slot_number: number;
  pickup_time: string;
  departure_time: string;
  notes: string;
  status: string;
};

export type DepartureSelection = {
  id: string;
  student_id: string;
  slot_id: string;
  selection_date: string;
};

export type DailyAssignment = {
  id: string;
  driver_id?: string | null;
  driver_name: string;
  driver_contact: string;
  seat_confirmed: boolean;
  confirmed_at: string;
  coasters: { coaster_number: string };
};

export type WeeklySchedule = {
  id: string;
  day_of_week: string;
  arrival_time: string;
  departure_time: string;
  change_count: number;
  last_changed_at: string;
  pickup_points: { name: string };
};

export type Payment = {
  id: string;
  amount: number;
  month: string;
  status: string;
  paid_at: string;
};

export type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
};

export type Holiday = {
  id: string;
  date: string;
  reason: string;
};

export type PickupPoint = { id: string; name: string; route_id: string };

// The weekly_schedules table stores times as morning_departure /
// evening_departure; the UI calls them arrival_time / departure_time.
export type WeeklyScheduleRow = Omit<
  WeeklySchedule,
  'arrival_time' | 'departure_time'
> & {
  morning_departure: string | null;
  evening_departure: string | null;
};

export function fromScheduleRows(rows: WeeklyScheduleRow[]): WeeklySchedule[] {
  return rows.map((row) => ({
    ...row,
    arrival_time: toHHMM(row.morning_departure),
    departure_time: toHHMM(row.evening_departure),
  }));
}
export type DashboardTab =
  'home' | 'schedule' | 'payments' | 'timetable' | 'help' | 'profile';
export type ScheduleView = 'overview' | 'change' | 'timetable';

export const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function getNextWeekStart() {
  return getPakistanWeekStart(1);
}

export function canChangeTime(tripDate: string, tripTime: string) {
  const trip = new Date(`${tripDate}T${tripTime}:00+05:00`);
  const diffHours = (trip.getTime() - Date.now()) / (1000 * 60 * 60);
  return diffHours >= 8
    ? { allowed: true, reason: '' }
    : {
        allowed: false,
        reason: 'Deadline passed — must change at least 8 hours before trip',
      };
}

export function formatTime(t: string) {
  if (!t) return '—';

  const [hourStr, minuteStr] = t.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return t;

  const suffix = hour >= 12 ? 'PM' : 'AM';
  const normalizedHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${normalizedHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function formatDate(d: string) {
  const dateOnly = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = dateOnly
    ? new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
      )
    : new Date(d);

  return date.toLocaleDateString('en-PK', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function getNextWeekRange() {
  const start = new Date(`${getNextWeekStart()}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  const format = (date: Date) =>
    date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });

  return `${format(start)} – ${format(end)}`;
}
