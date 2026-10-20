const PAKISTAN_TIME_ZONE = 'Asia/Karachi';

export function getPakistanDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PAKISTAN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value;
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
