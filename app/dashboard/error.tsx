'use client';

import ErrorScreen from '@/components/ui/error-screen';

export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorScreen error={error} retry={retry} area="dashboard" backHref="/auth/login" backLabel="Back to login" />;
}
