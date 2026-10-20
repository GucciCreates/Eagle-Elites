export const PASSWORD_MIN_LENGTH = 6;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function validateEmail(value: string): string | undefined {
  const email = normalizeEmail(value);
  if (!email) return 'Enter your email address.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email address, like name@example.com.';
  }
  return undefined;
}

export function validateNewPassword(value: string): string | undefined {
  if (!value) return 'Enter a password.';
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  return undefined;
}

export function validateConfirmPassword(
  password: string,
  confirm: string,
): string | undefined {
  if (!confirm) return 'Confirm your password.';
  if (password !== confirm) return 'Passwords do not match.';
  return undefined;
}

/** Turns Supabase/network errors into short, friendly messages. */
export function friendlyAuthError(err: unknown, fallback: string): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err && 'message' in err
        ? String((err as { message: unknown }).message)
        : '';
  const message = raw.toLowerCase();

  if (!message) return fallback;
  if (message.includes('invalid login credentials')) {
    return 'That email and password don’t match. Please try again.';
  }
  if (message.includes('email not confirmed')) {
    return 'Please confirm your email first. Check your inbox for the link.';
  }
  if (
    message.includes('already registered') ||
    message.includes('already been registered') ||
    message.includes('user already exists')
  ) {
    return 'An account with this email already exists. Try logging in instead.';
  }
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'Too many attempts. Please wait a minute and try again.';
  }
  if (message.includes('should be different')) {
    return 'Your new password must be different from your old one.';
  }
  if (message.includes('password should be at least')) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (message.includes('weak') || message.includes('pwned')) {
    return 'That password is too easy to guess. Please choose a stronger one.';
  }
  if (
    message.includes('auth session missing') ||
    message.includes('expired') ||
    (message.includes('invalid') && message.includes('token'))
  ) {
    return 'This reset link is invalid or has expired. Please request a new one.';
  }
  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'Can’t reach the server. Check your connection and try again.';
  }
  if (message.includes('signups not allowed')) {
    return 'Sign-ups are currently closed. Please contact us on WhatsApp.';
  }
  return raw || fallback;
}
