import type { Metadata } from 'next';
import RiderDashboard from '@/components/dashboard/rider-dashboard';

export const metadata: Metadata = {
  title: 'Rider dashboard demo',
  description: 'A preview of the Eagle Elites rider dashboard with sample data.',
  robots: { index: false, follow: false },
};

/** Public preview with sample data. No session is read or written. */
export default function DemoPage() {
  return <RiderDashboard demo />;
}
