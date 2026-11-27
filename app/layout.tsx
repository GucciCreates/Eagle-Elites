import type { Metadata, Viewport } from 'next';
import { Archivo, IBM_Plex_Mono } from 'next/font/google';
import { BRAND, siteUrl } from '@/lib/brand';
import './globals.css';

// Archivo has a width axis: expanded cuts read like road and transit signage
// for headlines, normal width for body text. One family, one font file.
const archivo = Archivo({
  variable: '--font-archivo',
  subsets: ['latin'],
  axes: ['wdth'],
  display: 'swap',
});

// Times, fares and route codes.
const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['500'],
  display: 'swap',
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
      className={`${archivo.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
