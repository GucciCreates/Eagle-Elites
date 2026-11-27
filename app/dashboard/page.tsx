import type { Metadata } from 'next';
import RiderDashboard from '@/components/dashboard/rider-dashboard';

export const metadata: Metadata = {
  title: 'My dashboard',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <RiderDashboard />;
}
