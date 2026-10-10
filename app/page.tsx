'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type LiveRoute = {
  id: string;
  name: string;
  price: number;
};

type RouteDetail = {
  sector: string;
  arrivals: string[];
  departures: string[];
};

const ROUTE_DETAILS: Record<string, RouteDetail> = {
  'Air University (E-9 Campus)': {
    sector: 'E-9 Sector',
    arrivals: [
      '6:40 AM – Drop 7:45 AM',
      '8:30 AM – Drop 9:50 AM',
      '10:00 AM – Drop 11:30 AM',
      '12:30 PM – Drop 1:45 PM',
      '2:30 PM – Drop 4:00 PM',
      '3:20 PM – Drop 5:00 PM',
    ],
    departures: [
      '12:30 PM',
      '2:30 PM',
      '4:15 PM',
      '5:30 PM',
      '7:30 PM',
      '8:15 PM',
      '9:00 PM',
    ],
  },
  'Air University South (H-11 Campus)': {
    sector: 'H-11 Sector',
    arrivals: [
      '6:40 AM – Drop 7:45 AM',
      '8:30 AM – Drop 9:50 AM',
      '10:00 AM – Drop 11:30 AM',
      '12:30 PM – Drop 1:45 PM',
      '2:30 PM – Drop 4:00 PM',
      '3:20 PM – Drop 5:00 PM',
    ],
    departures: [
      '1:00 PM',
      '2:30 PM',
      '4:15 PM',
      '5:30 PM',
      '7:30 PM',
      '8:15 PM',
      '9:00 PM',
    ],
  },
  'Bahria University (E-9)': {
    sector: 'E-9 Sector',
    arrivals: [
      '6:40 AM – Drop 7:45 AM',
      '8:30 AM – Drop 9:50 AM',
      '10:00 AM – Drop 11:30 AM',
      '12:30 PM – Drop 1:45 PM',
      '2:30 PM – Drop 4:00 PM',
    ],
    departures: [
      '12:30 PM',
      '2:30 PM',
      '3:30 PM',
      '4:00 PM',
      '4:30 PM',
      '5:30 PM',
      '7:00 PM',
      '8:30 PM',
      '9:00 PM',
    ],
  },
  'NUST University (H-12)': {
    sector: 'H-12 Sector',
    arrivals: [
      '7:10 AM – Drop 8:45 AM',
      '8:30 AM – Drop 9:50 AM',
      '10:00 AM – Drop 11:30 AM',
      '12:30 PM – Drop 1:45 PM',
      '3:30 PM – Drop 4:50 PM',
    ],
    departures: [
      '1:15 PM (Inside NUST)',
      '2:50 PM (Gate 1)',
      '4:35 PM (Gate 1)',
      '5:00 PM (Inside NUST)',
    ],
  },
  'FAST NUCES (H-11)': {
    sector: 'H-11 Sector',
    arrivals: [
      '6:40 AM – Drop 7:45 AM',
      '8:30 AM – Drop 9:50 AM',
      '10:00 AM – Drop 11:30 AM',
      '12:30 PM – Drop 1:45 PM',
      '2:30 PM – Drop 4:00 PM',
    ],
    departures: [
      '1:00 PM',
      '2:30 PM',
      '4:15 PM',
      '5:30 PM',
      '7:30 PM',
      '8:15 PM',
      '9:00 PM',
    ],
  },
  'National Defence University (E-9)': {
    sector: 'E-9 Sector',
    arrivals: [
      '6:40 AM – Drop 7:45 AM',
      '8:30 AM – Drop 9:50 AM',
      '10:00 AM – Drop 11:30 AM',
      '12:30 PM – Drop 1:45 PM',
      '2:30 PM – Drop 4:00 PM',
    ],
    departures: [
      '12:30 PM',
      '2:30 PM',
      '3:30 PM',
      '4:00 PM',
      '5:30 PM',
      '7:00 PM',
      '8:30 PM',
      '9:00 PM',
    ],
  },
};

const FLEET = [
  {
    name: '4C-Saloon Coaster',
    seats: 28,
    icon: '🚌',
    features: [
      '28 Reclining Seats',
      'Individual AC Vents',
      'Free WiFi',
      'LED Multimedia',
      'GPS Tracking',
      'USB Charging',
    ],
  },
  {
    name: 'Toyota Hiace',
    seats: 15,
    icon: '🚐',
    features: [
      '15 Comfortable Seats',
      'Powerful AC',
      'WiFi Hotspot',
      'Bluetooth Audio',
      'GPS Enabled',
    ],
  },
  {
    name: 'Mercedes Van',
    seats: 12,
    icon: '🚙',
    features: [
      '12 Luxury Seats',
      'Leather Upholstery',
      'Climate Control',
      'Premium Sound',
      'Individual Screens',
    ],
  },
  {
    name: 'Toyota Coaster Executive',
    seats: 22,
    icon: '🚌',
    features: [
      '22 Executive Seats',
      'Extra Legroom',
      'Privacy Curtains',
      'Reading Lights',
      'Refreshment Station',
    ],
  },
  {
    name: 'Hiace Grand Cabin',
    seats: 18,
    icon: '🚐',
    features: [
      '18 Wide Seats',
      'Extra Luggage Space',
      'Wide Aisle',
      'AC & Heater',
      'Entertainment System',
    ],
  },
];

const PICKUP_ZONES = [
  'Hassan Abdal',
  'Wah Cantt (Br1–Br3)',
  'Gudwal / 26 Area',
  'Kohistan Enclave',
  'Wah Model Town',
  'New City Phase-II',
  'GT Road / Taxila',
  'B-17 MultiGardens',
  'D-17 Society',
  'E-16 / Tarnol / G-15',
];

const FEATURES = [
  {
    icon: '📍',
    title: 'Live GPS Tracking',
    desc: 'Real-time location updates shared as soon as the vehicle departs. Always know exactly where your transport is.',
  },
  {
    icon: '⏱️',
    title: 'Punctuality First',
    desc: "Multiple arrival and departure timings aligned perfectly with each institution's academic schedule.",
  },
  {
    icon: '🛡️',
    title: 'No One Left Behind',
    desc: 'If any passenger is missed due to a technical issue, we immediately provide alternate transport at no extra cost.',
  },
  {
    icon: '💬',
    title: '24/7 Support',
    desc: "Our admin team is available around the clock via WhatsApp. Day or night, we're always here for you.",
  },
  {
    icon: '✨',
    title: 'Luxury Fleet',
    desc: 'Premium 4C-Saloon Coasters, Toyota Hiaces and Mercedes Vans with AC, WiFi and multimedia entertainment.',
  },
  {
    icon: '🎉',
    title: 'Free Annual Trip',
    desc: 'Complimentary annual trip for all registered passengers. Saturday free rides for selected institute students.',
  },
];

const UNIVERSITIES = [
  'Air University',
  'NUST',
  'Bahria University',
  'FAST-NUCES',
  'NDU',
  'Islamic International University',
];
const HAMMAD =
  'https://wa.me/923225166580?text=Hi%20EETS%2C%20I%20want%20to%20book%20a%20seat.';
const WALEED =
  'https://wa.me/923135018125?text=Hi%20EETS%2C%20I%20want%20to%20book%20a%20seat.';

export default function LandingPage() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [counted, setCounted] = useState(false);
  const [yearsCount, setYearsCount] = useState(0);
  const [studentsCount, setStudentsCount] = useState(0);
  const [zonesCount, setZonesCount] = useState(0);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [activeFleet, setActiveFleet] = useState(0);
  const [liveRoutes, setLiveRoutes] = useState<LiveRoute[]>([]);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const statsRef = useRef<HTMLElement | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchPrices = async () => {
      setPricesLoading(true);
      const { data } = await supabase
        .from('routes')
        .select('id, name, price')
        .order('name');

      if (data && data.length > 0) {
        setLiveRoutes(data as LiveRoute[]);
        setLastUpdated(
          new Date().toLocaleTimeString('en-PK', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        );
      }
      setPricesLoading(false);
    };

    void fetchPrices();

    const interval = setInterval(
      () => {
        void fetchPrices();
      },
      5 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [supabase]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const animateCount = (
      setter: React.Dispatch<React.SetStateAction<number>>,
      target: number,
      duration: number,
    ) => {
      const steps = 60;
      const increment = target / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          setter(target);
          clearInterval(timer);
        } else {
          setter(Math.floor(current));
        }
      }, duration / steps);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted) {
          setCounted(true);
          animateCount(setYearsCount, 7, 1200);
          animateCount(setStudentsCount, 500, 2000);
          animateCount(setZonesCount, 9, 1000);
        }
      },
      { threshold: 0.35 },
    );

    const el = statsRef.current;
    if (el) observer.observe(el);

    return () => observer.disconnect();
  }, [counted]);

  const lowestPrice =
    liveRoutes.length > 0
      ? Math.min(...liveRoutes.map((route) => route.price))
      : 13500;
  const highestPrice =
    liveRoutes.length > 0
      ? Math.max(...liveRoutes.map((route) => route.price))
      : 13500;

  const priceDisplay =
    lowestPrice === highestPrice
      ? `PKR ${lowestPrice.toLocaleString()}`
      : `PKR ${lowestPrice.toLocaleString()} – ${highestPrice.toLocaleString()}`;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#070b10] text-white">
      <nav
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'border-b border-zinc-800/90 bg-[#0a0f14]/85 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#facc15] via-[#fbbf24] to-[#f59e0b] shadow-[0_18px_32px_rgba(250,204,21,0.35)]">
              <span className="text-sm font-black text-black">EE</span>
            </div>
            <div>
              <p className="text-sm font-black leading-none text-white">
                Eagles Elite
              </p>
              <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                Transport Service
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-7 md:flex">
            <a
              href="#routes"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Routes
            </a>
            <a
              href="#fleet"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Fleet
            </a>
            <a
              href="#features"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Why Us
            </a>
            <a
              href="#contact"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Contact
            </a>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/auth/login')}
              className="hidden px-3 py-2 text-sm font-medium text-zinc-300 transition hover:text-white sm:block"
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => router.push('/auth/signup')}
              className="rounded-xl bg-gradient-to-r from-[#facc15] to-[#fbbf24] px-4 py-2.5 text-sm font-bold text-black shadow-[0_12px_30px_rgba(250,204,21,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(250,204,21,0.32)]"
            >
              Book Seat
            </button>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(250,204,21,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.11),transparent_26%)]" />
          <div className="absolute left-[8%] top-[18%] h-[420px] w-[420px] rounded-full bg-[#facc15]/8 blur-[110px]" />
          <div className="absolute right-[10%] top-[14%] h-[360px] w-[360px] rounded-full bg-[#38bdf8]/8 blur-[120px]" />

          <div className="relative mx-auto grid max-w-6xl gap-10 px-6 pb-20 pt-28 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:pt-32">
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-[#facc15]/20 bg-[#facc15]/8 px-4 py-2 text-sm font-medium text-[#fef3c7]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#facc15] shadow-[0_0_12px_rgba(250,204,21,0.9)]" />
                SECP Registered · License No. 023072 · 7 Years of Excellence
              </div>

              <h1 className="max-w-xl text-5xl font-black leading-[0.98] tracking-[-0.06em] text-white md:text-6xl xl:text-7xl">
                Eagles Elite
                <span className="mt-2 block text-[#facc15]">
                  Transport Service & Tour Planners
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-400 md:text-xl">
                Your Journey. Our Responsibility.
              </p>

              <p className="mt-4 max-w-xl text-base leading-7 text-zinc-400">
                Reliable, safe and comfortable pick-and-drop services for
                students, faculty, hospital staff and corporate professionals
                across Islamabad and Rawalpindi.
              </p>

              <div className="mt-6 flex flex-wrap gap-2 text-xs text-zinc-300">
                {UNIVERSITIES.map((uni) => (
                  <span
                    key={uni}
                    className="rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1.5"
                  >
                    {uni}
                  </span>
                ))}
                <span className="rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1.5">
                  +15 more
                </span>
              </div>

              <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={() => router.push('/auth/signup')}
                  className="w-full rounded-2xl bg-gradient-to-r from-[#facc15] to-[#fbbf24] px-8 py-4 text-base font-bold text-black shadow-[0_20px_40px_rgba(250,204,21,0.28)] transition hover:-translate-y-0.5 sm:w-auto"
                >
                  Book Your Seat →
                </button>
                <a
                  href={HAMMAD}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900/80 px-8 py-4 text-base font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-800 sm:w-auto"
                >
                  <span className="text-xl">💬</span>
                  WhatsApp Us
                </a>
              </div>

              <div className="mt-6 flex items-center gap-2 text-xs text-zinc-500">
                <span>Scroll to explore</span>
                <span aria-hidden="true">↓</span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-6 top-8 h-32 w-32 rounded-full bg-[#facc15]/10 blur-3xl" />
              <div className="absolute -right-4 bottom-4 h-32 w-32 rounded-full bg-[#60a5fa]/10 blur-3xl" />

              <div className="relative overflow-hidden rounded-[30px] border border-zinc-800 bg-[linear-gradient(160deg,_rgba(15,23,42,0.92),_rgba(9,12,18,0.96))] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
                <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/80 p-4">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">
                        Live route
                      </p>
                      <h3 className="mt-1 text-2xl font-bold text-white">
                        Islamabad to Bahria
                      </h3>
                    </div>
                    <div className="rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-2.5 py-1.5 text-xs font-semibold text-[#86efac]">
                      On time
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        name: 'Bahria Town',
                        time: '6:40 AM',
                        status: 'Most booked',
                      },
                      {
                        name: 'G-11 / F-11',
                        time: '7:15 AM',
                        status: 'High demand',
                      },
                      {
                        name: 'FAST & NUST',
                        time: '8:00 AM',
                        status: 'Daily route',
                      },
                    ].map((route) => (
                      <div
                        key={route.name}
                        className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3"
                      >
                        <div>
                          <p className="font-semibold text-white">
                            {route.name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {route.status}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                            Pickup
                          </p>
                          <p className="font-bold text-[#facc15]">
                            {route.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4">
                    <div className="flex items-center justify-between text-sm text-[#fef3c7]">
                      <span>Next departure</span>
                      <span className="font-bold text-white">6:40 AM</span>
                    </div>
                    <div className="mt-3 h-2.5 w-full rounded-full bg-zinc-800">
                      <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#facc15] to-[#f59e0b]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="stats" ref={statsRef} className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[#facc15]">
                Trusted service
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-4">
              {[
                {
                  value: yearsCount,
                  suffix: '+',
                  label: 'Years of Excellence',
                  icon: '🏆',
                  sub: 'Trusted since 2019',
                },
                {
                  value: studentsCount,
                  suffix: '+',
                  label: 'Happy Commuters',
                  icon: '👥',
                  sub: 'Daily passengers',
                },
                {
                  value: zonesCount,
                  suffix: '',
                  label: 'Pickup Zones',
                  icon: '📍',
                  sub: 'Across Isb & Rwp',
                },
                {
                  value: '24/7',
                  label: 'Support',
                  icon: '💬',
                  sub: 'Always available',
                },
              ].map((stat, index) => (
                <div
                  key={index}
                  className="rounded-[26px] border border-zinc-800 bg-[linear-gradient(180deg,_rgba(17,24,39,0.88),_rgba(9,12,18,0.92))] p-6 text-left shadow-[0_18px_45px_rgba(0,0,0,0.22)]"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-3xl">{stat.icon}</span>
                    <span className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">
                      Live
                    </span>
                  </div>
                  <p className="text-4xl font-black text-white">
                    {typeof stat.value === 'number' ? stat.value : stat.value}
                    {typeof stat.value === 'number' ? stat.suffix : ''}
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-xs text-zinc-400">{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#facc15]/10 text-2xl ring-1 ring-[#facc15]/15">
                    ₨
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                      Monthly Fee
                    </p>
                    <p className="text-3xl font-black text-white">
                      {pricesLoading ? 'Loading...' : priceDisplay}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Live price
                </div>
              </div>

              <div className="mt-4 text-sm text-zinc-300">
                With AC:{' '}
                <span className="font-semibold text-white">
                  {pricesLoading
                    ? '...'
                    : `PKR ${(lowestPrice + 500).toLocaleString()}`}
                </span>
                {' · '}Seat Reservation: PKR 1,000 · Fee deadline: 10th of every
                month
              </div>

              {lastUpdated && (
                <div className="mt-2 text-xs text-zinc-500">
                  ⚡ Prices subject to change · Last updated: {lastUpdated}
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="routes" className="px-6 py-18">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#facc15]">
                University Routes
              </p>
              <h2 className="text-4xl font-black tracking-[-0.05em] text-white md:text-5xl">
                We Serve 15+ Institutions
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
                Multiple arrival and departure timings tailored to each
                institution schedule.
              </p>
              <p className="mt-3 text-sm text-zinc-500">
                ⚡ Prices are live and subject to change. Last updated:{' '}
                {lastUpdated || '...'}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {liveRoutes.length > 0 || pricesLoading ? (
                (() => {
                  const routeCards: Array<LiveRoute | null> =
                    liveRoutes.length > 0
                      ? liveRoutes
                      : Array.from({ length: 6 }, () => null);

                  return routeCards.map((route, index) => {
                    const routeName = route?.name ?? 'Loading route';
                    const routeId = route?.id ?? `skeleton-${index}`;
                    const details = route
                      ? ROUTE_DETAILS[route.name]
                      : undefined;
                    const isSelected = selectedRoute === routeId;

                    return (
                      <div
                        key={routeId}
                        className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.18)]"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            route
                              ? setSelectedRoute(isSelected ? null : route.id)
                              : undefined
                          }
                          className="w-full text-left"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                                {details?.sector || 'Route'}
                              </p>
                              <h3 className="mt-2 text-xl font-bold text-white">
                                {routeName}
                              </h3>
                            </div>
                            <div className="rounded-full bg-[#facc15]/10 px-2 py-1 text-xs font-semibold text-[#facc15]">
                              Live
                            </div>
                          </div>

                          <div className="mb-3 flex items-end justify-between gap-4">
                            <div>
                              <p className="text-3xl font-black text-white">
                                {route
                                  ? `PKR ${route.price.toLocaleString()}`
                                  : '...'}
                              </p>
                              <p className="text-xs text-zinc-500">/ month</p>
                            </div>
                            <div className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-1 text-[10px] text-zinc-400">
                              {route && route.price
                                ? 'Current rate'
                                : 'Pending'}
                            </div>
                          </div>

                          <div className="mb-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.12em] text-zinc-400">
                            {[
                              'Multiple Timings',
                              'Sat/Sun Facility',
                              'Live Tracking',
                            ].map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-zinc-700 bg-zinc-950 px-2 py-1"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>

                          <div className="text-sm font-medium text-[#facc15]">
                            {details
                              ? isSelected
                                ? 'Tap to collapse ↑'
                                : 'Tap for timings ↓'
                              : 'Contact us for timings'}
                          </div>
                        </button>

                        {isSelected && details && (
                          <div className="mt-4 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                            <div>
                              <p className="mb-2 text-sm font-semibold text-white">
                                🌅 Arrivals
                              </p>
                              <ul className="space-y-2 text-sm text-zinc-300">
                                {details.arrivals.map((arrival) => (
                                  <li key={arrival}>• {arrival}</li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <p className="mb-2 text-sm font-semibold text-white">
                                🌆 Departures
                              </p>
                              <ul className="space-y-2 text-sm text-zinc-300">
                                {details.departures.map((departure) => (
                                  <li key={departure}>• {departure}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-xs text-yellow-100">
                              💡 Price shown is current as of {lastUpdated}.
                              Subject to change — confirm with admin before
                              booking.
                            </div>

                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                router.push('/auth/signup');
                              }}
                              className="block w-full rounded-xl bg-yellow-400 px-4 py-2.5 text-center text-sm font-bold text-black transition hover:bg-yellow-300"
                            >
                              Book This Route →
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()
              ) : (
                <div className="col-span-full rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-8 text-center text-zinc-400">
                  No routes available right now.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#facc15]">
                📍 Pickup Zones
              </p>
              <h2 className="text-4xl font-black tracking-[-0.05em] text-white md:text-5xl">
                We cover 9 major zones across Islamabad, Rawalpindi and Wah
                Cantt
              </h2>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {PICKUP_ZONES.map((zone) => (
                <div
                  key={zone}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-sm font-medium text-zinc-200"
                >
                  {zone}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="fleet" className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#facc15]">
                Our Fleet
              </p>
              <h2 className="text-4xl font-black tracking-[-0.05em] text-white md:text-5xl">
                Top-Notch Vehicles
              </h2>
              <p className="mt-4 text-lg text-zinc-400">
                AC, WiFi, GPS tracking and multimedia on every vehicle.
              </p>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              {FLEET.map((vehicle, index) => (
                <button
                  key={vehicle.name}
                  type="button"
                  onClick={() => setActiveFleet(index)}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition whitespace-nowrap ${
                    activeFleet === index
                      ? 'border-yellow-400 bg-yellow-400 text-black'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-white'
                  }`}
                >
                  <span>{vehicle.icon}</span>
                  {vehicle.name}
                </button>
              ))}
            </div>

            <div className="rounded-[30px] border border-zinc-800 bg-[linear-gradient(180deg,_rgba(15,23,42,0.9),_rgba(9,12,18,0.96))] p-6">
              <div className="grid gap-8 lg:grid-cols-[0.5fr_1fr] lg:items-center">
                <div className="flex items-center justify-center rounded-[26px] border border-zinc-800 bg-zinc-950/80 p-10 text-7xl">
                  {FLEET[activeFleet].icon}
                </div>

                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <h3 className="text-3xl font-black text-white">
                      {FLEET[activeFleet].name}
                    </h3>
                    <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-400">
                      {FLEET[activeFleet].seats} seats
                    </span>
                  </div>

                  <p className="mb-4 text-xl font-semibold text-[#facc15]">
                    {FLEET[activeFleet].seats} Seats
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {FLEET[activeFleet].features.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-200"
                      >
                        <span className="text-[#facc15]">✓</span>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#facc15]">
                Why Choose EETS
              </p>
              <h2 className="text-4xl font-black tracking-[-0.05em] text-white md:text-5xl">
                Elite Rides, Every Day
              </h2>
              <p className="mt-4 text-lg text-zinc-400">
                Elite rides, friendly service — transport that truly cares about
                your journey.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-6"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#facc15]/10 text-2xl ring-1 ring-[#facc15]/15">
                    {feature.icon}
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-white">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-7 text-zinc-400">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-[30px] border border-zinc-800 bg-zinc-900/80 py-8">
              <p className="mb-5 text-center text-sm font-semibold uppercase tracking-[0.28em] text-[#facc15]">
                Trusted by students at
              </p>
              <div className="flex flex-wrap justify-center gap-3 px-6">
                {[...UNIVERSITIES, '+ 15 More'].map((uni) => (
                  <span
                    key={uni}
                    className="rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-300"
                  >
                    {uni}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 pb-20 pt-10">
          <div className="mx-auto max-w-5xl">
            <div className="overflow-hidden rounded-[30px] border border-[#facc15]/20 bg-[linear-gradient(135deg,rgba(250,204,21,0.12),rgba(15,23,42,0.92),rgba(9,12,18,0.96))] p-8 shadow-[0_30px_80px_rgba(250,204,21,0.08)] md:p-12">
              <div className="flex flex-col items-center text-center">
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.28em] text-[#facc15]">
                  Ready to Ride?
                </p>
                <h2 className="text-4xl font-black tracking-[-0.05em] text-white md:text-5xl">
                  Reserve Your Seat Today
                </h2>
                <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-300">
                  Experience the most comfortable campus commute in Islamabad
                  and Rawalpindi.
                </p>

                <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => router.push('/auth/signup')}
                    className="rounded-2xl bg-[#facc15] px-8 py-4 text-base font-bold text-black shadow-[0_16px_38px_rgba(250,204,21,0.3)] transition hover:-translate-y-0.5"
                  >
                    Book Your Seat →
                  </button>
                  <a
                    href={HAMMAD}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900/70 px-8 py-4 text-base font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-800"
                  >
                    <span>💬</span>
                    WhatsApp Hammad
                  </a>
                </div>

                <div className="mt-5 text-sm text-zinc-400">
                  ⚡ Prices subject to change · Seat reservation PKR 1,000 · Fee
                  deadline 10th of every month
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#facc15]">
                Get In Touch
              </p>
              <h2 className="text-4xl font-black tracking-[-0.05em] text-white md:text-5xl">
                Contact Eagles Elite
              </h2>
              <p className="mt-4 text-lg text-zinc-400">
                Reach out on WhatsApp or call directly. We respond fast.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <a
                href={HAMMAD}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-6 transition hover:border-[#facc15]/40"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#facc15]/10 text-2xl text-[#facc15]">
                  💬
                </div>
                <p className="text-xl font-bold text-white">M. Hammad</p>
                <p className="mt-1 text-sm text-zinc-400">0322 5166580</p>
                <p className="mt-3 text-sm text-zinc-500">WhatsApp / Call</p>
              </a>

              <a
                href={WALEED}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-6 transition hover:border-[#facc15]/40"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#facc15]/10 text-2xl text-[#facc15]">
                  💬
                </div>
                <p className="text-xl font-bold text-white">Engr. Waleed</p>
                <p className="mt-1 text-sm text-zinc-400">0313 5018125</p>
                <p className="mt-3 text-sm text-zinc-500">WhatsApp / Call</p>
              </a>

              <a
                href="mailto:eagleselitepk@gmail.com"
                className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-6 transition hover:border-[#facc15]/40"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#facc15]/10 text-2xl text-[#facc15]">
                  ✉️
                </div>
                <p className="text-xl font-bold text-white">Email Us</p>
                <p className="mt-1 text-sm text-zinc-400">
                  eagleselitepk@gmail.com
                </p>
                <p className="mt-3 text-sm text-zinc-500">Business enquiries</p>
              </a>
            </div>

            <div className="mt-6 rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5 text-center text-zinc-300">
              <div className="flex items-center justify-center gap-2 text-[#facc15]">
                <span>📍</span>
                <span>
                  Office 01, GT Road, Barrier No. 03, Wah Cantt, Pakistan
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#facc15] to-[#f59e0b] text-xs font-black text-black">
              EE
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Eagles Elite Transport Service (SMC) Pvt Ltd
              </p>
              <p className="text-xs text-zinc-500">
                SECP Registered · License No. 023072
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5 text-sm text-zinc-500">
            <button
              type="button"
              onClick={() => router.push('/auth/login')}
              className="transition hover:text-white"
            >
              Student Login
            </button>
            <button
              type="button"
              onClick={() => router.push('/auth/signup')}
              className="transition hover:text-white"
            >
              Sign Up
            </button>
            <a
              href={HAMMAD}
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-white"
            >
              WhatsApp
            </a>
            <button
              type="button"
              onClick={() => router.push('/admin/login')}
              className="text-xs text-zinc-700 transition hover:text-zinc-500"
            >
              Admin
            </button>
          </div>
        </div>

        <div className="mx-auto mt-4 max-w-6xl text-center text-xs text-zinc-600">
          © 2026 Eagles Elite Transport Service (SMC) Pvt Ltd. All rights
          reserved.
        </div>
      </footer>
    </div>
  );
}
