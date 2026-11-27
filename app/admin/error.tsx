'use client';

import ErrorScreen from '@/components/ui/error-screen';

export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorScreen error={error} retry={retry} area="admin page" backHref="/admin/dashboard" backLabel="Admin dashboard" />;
}
