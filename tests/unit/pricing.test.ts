import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AC_SURCHARGE, RESERVATION_FEE, amountDue, formatPkr, monthlyFee } from '@/lib/onboarding/pricing';

describe('pricing', () => {
  it('adds the AC surcharge only when AC is chosen', () => {
    expect(monthlyFee(9500, false)).toBe(9500);
    expect(monthlyFee(9500, true)).toBe(10000);
  });

  it('first payment = monthly fee + one-time reservation fee', () => {
    expect(amountDue(11000, true)).toBe(12500);
    expect(amountDue(7000, false)).toBe(8000);
  });

  it('formats rupees, and a dash when unknown', () => {
    expect(formatPkr(12500)).toBe('PKR 12,500');
    expect(formatPkr(null)).toBe('—');
  });

  it('matches public.onboarding_amount_due() in the database migration', () => {
    const sql = readFileSync('supabase/migrations/20261022000000_onboarding_v2.sql', 'utf8');
    const fn = sql.slice(sql.indexOf('FUNCTION public.onboarding_amount_due'));
    expect(fn).toContain(`THEN ${AC_SURCHARGE} ELSE 0 END + ${RESERVATION_FEE}`);
  });
});
