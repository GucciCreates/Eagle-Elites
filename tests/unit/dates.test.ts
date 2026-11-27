import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPakistanDate, getPakistanDateForWeekday, getPakistanWeekStart } from '@/lib/date/pakistan';
import { canChangeTime, getNextWeekStart } from '@/lib/dashboard/student';

afterEach(() => vi.useRealTimers());

describe('Pakistan dates', () => {
  it('uses Pakistan time, not UTC, near midnight', () => {
    // 20:30 UTC on 30 Nov is 01:30 on 1 Dec in Pakistan (UTC+5).
    expect(getPakistanDate(new Date('2026-11-30T20:30:00Z'))).toBe('2026-12-01');
  });

  it('finds the Monday of the current and next week', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-27T06:00:00Z')); // Friday 27 Nov in Pakistan
    expect(getPakistanWeekStart()).toBe('2026-11-23');
    expect(getPakistanWeekStart(1)).toBe('2026-11-30');
    expect(getNextWeekStart()).toBe('2026-11-30');
  });

  it('maps a weekday name to its date', () => {
    expect(getPakistanDateForWeekday('2026-11-30', 'Monday')).toBe('2026-11-30');
    expect(getPakistanDateForWeekday('2026-11-30', 'Saturday')).toBe('2026-12-05');
    expect(getPakistanDateForWeekday('2026-11-30', 'Someday')).toBe('2026-11-30');
  });
});

describe('8-hour trip change rule', () => {
  it('allows changes 8 or more hours before the trip', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-29T21:00:00+05:00')); // Sun 9 PM PKT
    expect(canChangeTime('2026-11-30', '07:00').allowed).toBe(true); // 10 h ahead
    expect(canChangeTime('2026-11-30', '05:00').allowed).toBe(true); // exactly 8 h
  });

  it('blocks changes less than 8 hours before the trip', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-30T00:00:00+05:00')); // midnight PKT
    const result = canChangeTime('2026-11-30', '07:00'); // 7 h ahead
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/8 hours/);
  });
});
