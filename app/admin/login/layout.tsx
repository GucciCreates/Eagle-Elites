import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin log in',
  description: 'Eagle Elites staff log in.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
