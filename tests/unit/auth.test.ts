import { describe, expect, it } from 'vitest';
import {
  PASSWORD_MIN_LENGTH,
  friendlyAuthError,
  normalizeEmail,
  validateConfirmPassword,
  validateEmail,
  validateNewPassword,
} from '@/lib/auth/form';
import { getPostLoginPath } from '@/lib/auth/post-login-path';

describe('sign-in routing by application status', () => {
  it.each([
    ['active', '/dashboard'],
    ['payment_pending', '/onboarding/payment'],
    ['pending', '/onboarding/pending'],
    ['rejected', '/onboarding/pending'],
    ['incomplete', '/onboarding/profile'],
    [null, '/onboarding/profile'],
  ])('%s → %s', (status, path) => {
    expect(getPostLoginPath(status)).toBe(path);
  });
});

describe('form validation', () => {
  it('requires passwords of at least 8 characters', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(validateNewPassword('1234567')).toMatch(/at least 8/);
    expect(validateNewPassword('12345678')).toBeUndefined();
    expect(validateNewPassword('')).toBeDefined();
  });

  it('checks confirmation matches', () => {
    expect(validateConfirmPassword('abcdefgh', 'abcdefgh')).toBeUndefined();
    expect(validateConfirmPassword('abcdefgh', 'abcdefgx')).toMatch(/do not match/);
  });

  it('normalises and validates email', () => {
    expect(normalizeEmail('  Ali@Example.COM ')).toBe('ali@example.com');
    expect(validateEmail('ali@example.com')).toBeUndefined();
    expect(validateEmail('ali@')).toBeDefined();
  });

  it('turns auth errors into friendly messages', () => {
    expect(friendlyAuthError(new Error('Invalid login credentials'), 'x')).toMatch(/don’t match/);
    expect(friendlyAuthError(new Error('Failed to fetch'), 'x')).toMatch(/connection/);
    expect(friendlyAuthError(null, 'fallback')).toBe('fallback');
  });
});
