import { describe, expect, it } from 'vitest';
import { isIsoDate, isUuid, optionalText, safeEqual, text } from '@/lib/api/validate';

describe('API input validation', () => {
  it('accepts only real UUIDs', () => {
    expect(isUuid('00000000-0000-0000-0000-000000000001')).toBe(true);
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid(42)).toBe(false);
  });

  it('accepts only real calendar dates', () => {
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('2026-02-31')).toBe(false);
    expect(isIsoDate('28-02-2026')).toBe(false);
  });

  it('trims and length-checks text', () => {
    expect(text('  hi  ', { max: 5 })).toBe('hi');
    expect(text('   ', { max: 5 })).toBeNull();
    expect(text('toolong', { max: 5 })).toBeNull();
    expect(optionalText('', 5)).toBeNull();
    expect(optionalText('toolong', 5)).toBeUndefined();
  });

  it('compares secrets safely', () => {
    expect(safeEqual('Bearer abc', 'Bearer abc')).toBe(true);
    expect(safeEqual('Bearer abc', 'Bearer abd')).toBe(false);
    expect(safeEqual('short', 'longer value')).toBe(false);
  });
});
