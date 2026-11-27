'use client';

import ErrorScreen from '@/components/ui/error-screen';

export default function DriverError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorScreen error={error} retry={retry} area="trip list" backHref="/driver/login" backLabel="Back to login" />;
}
