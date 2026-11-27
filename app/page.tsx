import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import LandingPage from '@/components/marketing/landing-page';
import { getLandingData } from '@/lib/public/landing-data';

export const metadata: Metadata = {
  title: {
    absolute: 'Eagle Elites | Student & Staff Transport in Islamabad, Rawalpindi & Wah Cantt',
  },
  description:
    'Daily door-to-campus transport for students and staff. Live GPS tracking, clear monthly fares, your own timetable and 24/7 WhatsApp support. Book your seat in minutes.',
  alternates: { canonical: '/' },
};

export default async function Page() {
  'use cache';
  cacheLife('minutes');

  const data = await getLandingData();
  return <LandingPage data={data} />;
}
