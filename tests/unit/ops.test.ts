import { describe, expect, it } from 'vitest';
import { addDays, weekdayOf, weekStartOf } from '@/lib/date/pakistan';
import { findAbsenceAlerts } from '@/lib/ops/absence';
import { enqueue, flushQueue, parseQueue } from '@/lib/ops/offline-queue';
import { buildPlan, type PlanInput } from '@/lib/ops/plan';
import { hereMessage, tripMessage } from '@/lib/ops/trip-messages';

const base: PlanInput = {
  date: '2026-12-01',
  holiday: null,
  routes: [{ id: 'r1', name: 'Wah Cantt → Islamabad' }, { id: 'r2', name: 'Rawalpindi → NUST' }],
  students: [
    { id: 's1', full_name: 'Ali', route_id: 'r1', status: 'active' },
    { id: 's2', full_name: 'Bina', route_id: 'r1', status: 'active' },
    { id: 's3', full_name: 'Cyra', route_id: 'r1', status: 'active' },
    { id: 's4', full_name: 'Dawood', route_id: 'r1', status: 'pending' },
    { id: 's5', full_name: 'Esha', route_id: 'r2', status: 'active' },
  ],
  scheduledIds: ['s1', 's2', 's3', 's4', 's5'],
  skippedIds: [],
  existing: [],
  coasters: [
    { id: 'c1', coaster_number: 'EE-12', seat_capacity: 2, default_route_id: 'r1', maintenance_status: 'active' },
    { id: 'c2', coaster_number: 'EE-14', seat_capacity: 10, default_route_id: 'r1', maintenance_status: 'maintenance' },
    { id: 'c3', coaster_number: 'EE-20', seat_capacity: 20, default_route_id: 'r2', maintenance_status: 'active' },
  ],
  drivers: [
    { id: 'd1', full_name: 'Driver One', phone: '0300', usual_vehicle_id: 'c1', active: true },
    { id: 'd3', full_name: 'Driver Three', phone: null, usual_vehicle_id: 'c3', active: true },
  ],
};

describe('buildPlan', () => {
  it('seats scheduled, active riders in the usual vehicle with its driver', () => {
    const plan = buildPlan(base);
    expect(plan.rows.map((r) => [r.student_id, r.coaster_id, r.driver_id])).toEqual([
      ['s1', 'c1', 'd1'],
      ['s2', 'c1', 'd1'],
      ['s5', 'c3', 'd3'],
    ]);
    expect(plan.rows[0]).toMatchObject({ assignment_date: '2026-12-01', seat_confirmed: false, driver_contact: '0300' });
  });

  it('reports riders over capacity and skips vehicles in maintenance', () => {
    const r1 = buildPlan(base).routes.find((r) => r.route_id === 'r1')!;
    expect(r1.unplaced).toEqual(['Cyra']);
    expect(r1.vehicles.map((v) => v.coaster_number)).toEqual(['EE-12']);
    expect(r1.warnings).toContain('1 rider over capacity.');
  });

  it('leaves out students not riding, unscheduled, or already assigned (counting their seats)', () => {
    const plan = buildPlan({
      ...base,
      scheduledIds: ['s1', 's2', 's3', 's5'],
      skippedIds: ['s1'],
      existing: [{ student_id: 's2', coaster_id: 'c1' }],
    });
    expect(plan.rows.map((r) => r.student_id)).toEqual(['s3', 's5']);
    const r1 = plan.routes.find((r) => r.route_id === 'r1')!;
    expect(r1).toMatchObject({ riders: 1, alreadyAssigned: 1, skipped: 1, unplaced: [] });
  });

  it('counts active students who set no trip for that day', () => {
    const r2 = buildPlan({ ...base, scheduledIds: ['s1'] }).routes.find((r) => r.route_id === 'r2')!;
    expect(r2).toMatchObject({ riders: 0, notScheduled: 1 });
  });

  it('warns when a vehicle has no driver', () => {
    const plan = buildPlan({ ...base, drivers: base.drivers.filter((d) => d.id !== 'd3') });
    const r2 = plan.routes.find((r) => r.route_id === 'r2')!;
    expect(r2.warnings).toContain('EE-20 has no available driver.');
    expect(r2.unplaced).toEqual(['Esha']);
  });

  it('plans nothing on a holiday', () => {
    expect(buildPlan({ ...base, holiday: 'Quaid-e-Azam Day' })).toMatchObject({ rows: [], routes: [], holiday: 'Quaid-e-Azam Day' });
  });
});

describe('findAbsenceAlerts', () => {
  const row = (student_id: string, day: number, status: 'present' | 'absent' | null) => ({
    student_id,
    assignment_date: `2026-11-${String(day).padStart(2, '0')}`,
    attendance_status: status,
  });

  it('flags three absences in a row and ignores unmarked trips', () => {
    const alerts = findAbsenceAlerts([row('s1', 20, 'present'), row('s1', 21, 'absent'), row('s1', 24, 'absent'), row('s1', 25, 'absent'), row('s1', 26, null)]);
    expect(alerts).toEqual([{ student_id: 's1', kind: 'streak', streak: 3, absent: 3, recorded: 4 }]);
  });

  it('flags absent on half of 4+ trips', () => {
    const alerts = findAbsenceAlerts([row('s2', 20, 'absent'), row('s2', 21, 'present'), row('s2', 24, 'absent'), row('s2', 25, 'present')]);
    expect(alerts.map((a) => a.kind)).toEqual(['pattern']);
  });

  it('leaves regular riders alone', () => {
    expect(findAbsenceAlerts([row('s3', 20, 'present'), row('s3', 21, 'absent'), row('s3', 24, 'present'), row('s3', 25, 'present')])).toEqual([]);
  });
});

describe('trip messages', () => {
  it('words updates for riders and skips admin-only ones', () => {
    expect(tripMessage('morning', 'arriving', 'EE-12')?.message).toBe('Vehicle EE-12 will reach your pickup point in about 10 minutes.');
    expect(tripMessage('morning', 'problem', 'EE-12', 'traffic')?.title).toBe('Your ride is delayed');
    expect(tripMessage('morning', 'arrived', 'EE-12')).toBeNull();
    expect(hereMessage(null).message).toBe('Your vehicle is at your pickup point now.');
  });
});

describe('offline attendance queue', () => {
  it('keeps only the latest tap per student and day', () => {
    let queue = enqueue([], { student_id: 's1', date: 'd', status: 'present', at: 1 });
    queue = enqueue(queue, { student_id: 's1', date: 'd', status: 'absent', at: 2 });
    queue = enqueue(queue, { student_id: 's2', date: 'd', status: 'present', at: 3 });
    expect(queue.map((m) => [m.student_id, m.status])).toEqual([['s1', 'absent'], ['s2', 'present']]);
  });

  it('survives bad storage and keeps what failed to send', async () => {
    expect(parseQueue('not json')).toEqual([]);
    expect(parseQueue('[{"student_id":"s1","date":"d","status":"maybe"}]')).toEqual([]);
    const left = await flushQueue(
      [{ student_id: 's1', date: 'd', status: 'present', at: 1 }, { student_id: 's2', date: 'd', status: 'absent', at: 2 }],
      async (mark) => {
        if (mark.student_id === 's2') throw new Error('offline');
        return true;
      },
    );
    expect(left.map((m) => m.student_id)).toEqual(['s2']);
  });
});

describe('date helpers', () => {
  it('finds weekdays and week starts across months', () => {
    expect(weekdayOf('2026-12-01')).toBe('Tuesday');
    expect(weekStartOf('2026-12-01')).toBe('2026-11-30');
    expect(weekStartOf('2026-11-30')).toBe('2026-11-30');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});
