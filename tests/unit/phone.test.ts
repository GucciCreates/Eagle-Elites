import { describe, expect, it } from 'vitest';
import { formatPkPhone, isPkMobile, normalizePkPhone } from '@/lib/phone';

describe('Pakistani phone numbers', () => {
  it.each([
    ['0322-5166580', '923225166580'],
    ['+92 322 5166580', '923225166580'],
    ['0092 322 5166580', '923225166580'],
    ['3225166580', '923225166580'],
  ])('normalises %s', (input, expected) => {
    expect(normalizePkPhone(input)).toBe(expected);
  });

  it.each(['', null, undefined, '12345', '0322516658', '03225166580123'])('rejects %s', (input) => {
    expect(normalizePkPhone(input)).toBeNull();
  });

  it('tells mobiles from landlines', () => {
    expect(isPkMobile('0322 5166580')).toBe(true);
    expect(isPkMobile('051 1234567')).toBe(false);
  });

  it('formats for display', () => {
    expect(formatPkPhone('03225166580')).toBe('+92 322 5166580');
    expect(formatPkPhone('not a number')).toBe('not a number');
  });
});
