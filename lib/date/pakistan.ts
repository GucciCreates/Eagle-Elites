const PAKISTAN_TIME_ZONE = 'Asia/Karachi';

export function getPakistanDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PAKISTAN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function getPakistanWeekStart(weekOffset = 0) {
  const today = getPakistanDate();
  const calendarDate = new Date(`${today}T00:00:00Z`);
  const dayFromMonday = (calendarDate.getUTCDay() + 6) % 7;
  calendarDate.setUTCDate(
    calendarDate.getUTCDate() - dayFromMonday + weekOffset * 7,
  );
  return calendarDate.toISOString().slice(0, 10);
}

export function getPakistanDateForWeekday(weekStart: string, weekday: string) {
  const weekdays = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  const weekdayIndex = weekdays.indexOf(weekday);
  if (weekdayIndex < 0) return weekStart;
  const date = new Date(`${weekStart}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + weekdayIndex);
  return date.toISOString().slice(0, 10);
}

/** YYYY-MM-DD shifted by whole days. */
export function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Monday of the week containing isoDate. */
export function weekStartOf(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return addDays(isoDate, -((date.getUTCDay() + 6) % 7));
}

/** "Monday" … "Sunday" for isoDate. */
export function weekdayOf(isoDate: string) {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
    new Date(`${isoDate}T00:00:00Z`).getUTCDay()
  ];
}

/** Current Pakistan time as "HH:MM" (24-hour). */
export function getPakistanTime(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: PAKISTAN_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
