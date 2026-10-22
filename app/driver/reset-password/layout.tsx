import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Driver password reset',
  description: 'Reset the password for an Eagle Elites driver account.',
  robots: { index: false, follow: false },
};

export default function DriverResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
