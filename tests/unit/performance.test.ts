import { describe, expect, it } from 'vitest';
import { mergeUnique, shiftIsoDate } from '@/lib/admin/queries';
import { hasSessionCookie } from '@/lib/supabase/lazy-client';

describe('hasSessionCookie', () => {
  it('finds a Supabase session cookie, plain or chunked', () => {
    expect(hasSessionCookie('sb-abcd-auth-token=base64-xyz')).toBe(true);
    expect(hasSessionCookie('theme=dark; sb-abcd-auth-token.0=base64-x; sb-abcd-auth-token.1=y')).toBe(true);
  });

  it('ignores other cookies, so signed-out visitors skip the SDK download', () => {
    expect(hasSessionCookie('')).toBe(false);
    expect(hasSessionCookie('theme=dark; _ga=GA1.1')).toBe(false);
    expect(hasSessionCookie('sb-abcd-auth-token-code-verifier=abc')).toBe(false);
    expect(hasSessionCookie('xsb-abcd-auth-token=1')).toBe(false);
  });
});

describe('shiftIsoDate', () => {
  it('moves across month and year boundaries', () => {
    expect(shiftIsoDate('2026-11-27', -14)).toBe('2026-11-13');
    expect(shiftIsoDate('2026-03-05', -14)).toBe('2026-02-19');
    expect(shiftIsoDate('2026-01-03', -14)).toBe('2025-12-20');
    expect(shiftIsoDate('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('mergeUnique', () => {
  it('keeps the first copy of each key in order', () => {
    const rows = mergeUnique(
      [
        [{ id: 'a', v: 1 }, { id: 'b', v: 1 }],
        [{ id: 'b', v: 2 }, { id: 'c', v: 2 }],
      ],
      (row) => row.id,
    );
    expect(rows).toEqual([{ id: 'a', v: 1 }, { id: 'b', v: 1 }, { id: 'c', v: 2 }]);
  });
});
