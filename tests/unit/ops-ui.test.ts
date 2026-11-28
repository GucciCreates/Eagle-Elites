import { describe, expect, it } from 'vitest';
import { buildChecklist, type ChecklistInput } from '@/lib/ops/checklist';
import { formatClock, parseOperationsSettings } from '@/lib/settings/operations';
import { skipWindow } from '@/components/dashboard/ride-days';

const base: ChecklistInput = {
  today: '2026-11-30',
  holidayToday: null,
  students: [
    { id: 's1', status: 'active', route_id: 'r1' },
    { id: 's2', status: 'active', route_id: 'r1' },
    { id: 's3', status: 'pending', route_id: 'r1' },
    { id: 's4', status: 'active', route_id: null },
  ],
  todayTrips: [
    { student_id: 's1', coaster_id: 'c1', seat_confirmed: false },
    { student_id: 'x', coaster_id: 'c1', seat_confirmed: true },
  ],
  coasters: [
    { id: 'c1', coaster_number: 'LEA-1', seat_capacity: 1, maintenance_status: 'active' },
    { id: 'c2', coaster_number: 'LEA-2', seat_capacity: 20, maintenance_status: 'maintenance' },
  ],
  drivers: [
    { id: 'd1', full_name: 'Ali', active: true, usual_vehicle_id: 'c1' },
    { id: 'd2', full_name: 'Bilal', active: true, usual_vehicle_id: null },
    { id: 'd3', full_name: 'Old', active: false, usual_vehicle_id: null },
  ],
  applications: [
    { id: 'a1', applied_at: '2026-11-27T00:00:00Z' },
    { id: 'a2', applied_at: '2026-11-29T23:00:00Z' },
  ],
  problems: [
    { id: 'p1', resolved_at: null },
    { id: 'p2', resolved_at: '2026-11-30T03:00:00Z' },
  ],
  failedChecks: 1,
  nowMs: Date.parse('2026-11-30T04:00:00Z'),
};

describe('morning checklist', () => {
  it('lists each problem with the right count', () => {
    const items = Object.fromEntries(buildChecklist(base).map((item) => [item.key, item.count]));
    expect(items).toEqual({ problems: 1, checks: 1, overfull: 1, 'no-trip': 1, unconfirmed: 1, maintenance: 1, drivers: 1, applications: 1 });
  });

  it('puts urgent items first and skips rider items on a holiday', () => {
    const items = buildChecklist({ ...base, holidayToday: 'Eid' });
    expect(items[0].tone).toBe('urgent');
    expect(items.some((item) => item.key === 'no-trip' || item.key === 'unconfirmed')).toBe(false);
  });

  it('is empty when all is well', () => {
    expect(
      buildChecklist({ ...base, students: [], todayTrips: [], coasters: [], drivers: [], applications: [], problems: [], failedChecks: 0 }),
    ).toEqual([]);
  });
});

describe('operations settings', () => {
  it('falls back to defaults for bad values', () => {
    expect(parseOperationsSettings({ skip_cutoff: '25:00', auto_plan: 'yes' })).toEqual({ skip_cutoff: '21:00', auto_plan: true, trip_whatsapp: true });
    expect(parseOperationsSettings({ skip_cutoff: '20:30', auto_plan: false, trip_whatsapp: false })).toEqual({ skip_cutoff: '20:30', auto_plan: false, trip_whatsapp: false });
  });

  it('formats a clock time', () => {
    expect(formatClock('21:00')).toBe('9:00 PM');
    expect(formatClock('00:15')).toBe('12:15 AM');
    expect(formatClock('12:00')).toBe('12:00 PM');
  });
});

describe('not-riding window', () => {
  it('covers the next 14 days and locks tomorrow after the cutoff', () => {
    const before = skipWindow('2026-11-30', '20:59', '21:00');
    expect(before).toHaveLength(14);
    expect(before[0]).toEqual({ date: '2026-12-01', locked: false });
    expect(before[13].date).toBe('2026-12-14');
    expect(skipWindow('2026-11-30', '21:00', '21:00')[0].locked).toBe(true);
    expect(skipWindow('2026-11-30', '21:00', '21:00')[1].locked).toBe(false);
  });
});
