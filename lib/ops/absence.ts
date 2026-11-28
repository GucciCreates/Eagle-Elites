/**
 * Absence alerts for admins (never sent to guardians).
 *  - streak:  the student's last 3+ recorded trips were all "absent"
 *  - pattern: absent on at least half of 4+ recorded trips in the window
 */
export type AttendanceRow = { student_id: string; assignment_date: string; attendance_status: 'present' | 'absent' | null };
export type AbsenceAlert = { student_id: string; kind: 'streak' | 'pattern'; streak: number; absent: number; recorded: number };

export const STREAK_DAYS = 3;
export const PATTERN_MIN_TRIPS = 4;

export function findAbsenceAlerts(rows: AttendanceRow[]): AbsenceAlert[] {
  const byStudent = new Map<string, AttendanceRow[]>();
  for (const row of rows) {
    if (!row.attendance_status) continue;
    if (!byStudent.has(row.student_id)) byStudent.set(row.student_id, []);
    byStudent.get(row.student_id)!.push(row);
  }
  const alerts: AbsenceAlert[] = [];
  for (const [studentId, trips] of byStudent) {
    trips.sort((a, b) => b.assignment_date.localeCompare(a.assignment_date));
    let streak = 0;
    for (const trip of trips) {
      if (trip.attendance_status !== 'absent') break;
      streak += 1;
    }
    const absent = trips.filter((t) => t.attendance_status === 'absent').length;
    const base = { student_id: studentId, streak, absent, recorded: trips.length };
    if (streak >= STREAK_DAYS) alerts.push({ ...base, kind: 'streak' });
    else if (trips.length >= PATTERN_MIN_TRIPS && absent * 2 >= trips.length) alerts.push({ ...base, kind: 'pattern' });
  }
  return alerts.sort((a, b) => b.streak - a.streak || b.absent - a.absent);
}
