import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { BRAND, siteUrl } from '@/lib/brand';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const description =
  'Student and staff transport across Islamabad, Rawalpindi and Wah Cantt — schedules, payments and trip updates in one portal.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  applicationName: BRAND.name,
  title: {
    default: `${BRAND.name} | Student Transport Portal`,
    template: `%s | ${BRAND.name}`,
  },
  description,
  openGraph: {
    type: 'website',
    siteName: BRAND.name,
    locale: 'en_PK',
    title: `${BRAND.name} — your daily ride to campus, handled`,
    description,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND.name} — your daily ride to campus, handled`,
    description,
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#070b10',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
