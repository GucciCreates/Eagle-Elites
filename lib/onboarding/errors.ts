import { friendlyAuthError } from '@/lib/auth/form';

/** Maps database/storage errors from onboarding to plain-language messages. */
export function friendlyOnboardingError(
  err: unknown,
  fallback: string,
): string {
  const message = (err as { message?: string } | null)?.message ?? '';
  if (/pickup point is not on the selected route/i.test(message))
    return 'That pickup point isn’t on the route you picked. Please choose a pickup point again.';
  if (/not allowed to change your account status/i.test(message))
    return 'Your application has already been submitted. Refresh the page to see its status.';
  if (/time option|not an allowed time/i.test(message))
    return 'Please choose one of the listed times.';
  if (/payload too large|exceeded the maximum allowed size/i.test(message))
    return 'That file is too large. Please choose one under 5 MB.';
  if (/row-level security|violates row-level/i.test(message))
    return 'We couldn’t save that. Please sign in again and retry.';
  if (/failed to fetch|network/i.test(message))
    return 'You seem to be offline. Your progress is saved on this device. Try again when connected.';
  return friendlyAuthError(err, fallback);
}
