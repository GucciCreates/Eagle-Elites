export function getPostLoginPath(status?: string | null) {
  if (status === 'payment_pending') return '/onboarding/payment';
  if (status === 'pending' || status === 'rejected') {
    return '/onboarding/pending';
  }
  if (status === 'active') return '/dashboard';
  return '/onboarding/profile';
}
