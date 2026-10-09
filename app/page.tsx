'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [counted, setCounted] = useState(false);
  const [vehicles, setVehicles] = useState(0);
  const [students, setStudents] = useState(0);
  const [years, setYears] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const animateCount = (
    setter: (n: number) => void,
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

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted) {
          setCounted(true);
          animateCount(setVehicles, 35, 1400);
          animateCount(setStudents, 500, 1800);
          animateCount(setYears, 8, 1200);
        }
      },
      { threshold: 0.35 },
    );

    const el = document.getElementById('stats');
    if (el) observer.observe(el);

    return () => observer.disconnect();
  }, [counted]);

  const whatsappNumber = '923225166580';
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=Hi%20Eagle%20Elites%2C%20I%27m%20interested%20in%20your%20transport%20service.`;

  const features = [
    {
      icon: '🛡️',
      title: 'Safe & Secure',
      desc: 'Every trip is backed by strict vehicle checks, professional drivers, and a safety-first mindset.',
    },
    {
      icon: '⏱️',
      title: 'Always On Time',
      desc: 'We design routes around real schedules so your commute starts and ends without stress.',
    },
    {
      icon: '🚐',
      title: 'Premium Fleet',
      desc: 'Clean, modern coasters and vans built for comfort, convenience, and consistent daily service.',
    },
    {
      icon: '📱',
      title: 'Smart Portal',
      desc: 'Track your route, driver, and schedule right from your phone with zero hassle.',
    },
    {
      icon: '👨‍✈️',
      title: 'Professional Drivers',
      desc: 'Experienced, calm, and courteous drivers who make every ride smooth and reliable.',
    },
    {
      icon: '🏫',
      title: 'Campus Ready',
      desc: 'Trusted by students, faculty, and daily commuters moving between Islamabad and Rawalpindi.',
    },
  ];

  const routeHighlights = [
    { name: 'Bahria Town', time: '6:40 AM', status: 'Most booked' },
    { name: 'G-11 / F-11', time: '7:15 AM', status: 'High demand' },
    { name: 'FAST & NUST', time: '8:00 AM', status: 'Daily route' },
  ];

  const testimonials = [
    {
      name: 'Ayesha K.',
      role: 'Student, Bahria University',
      text: 'Eagle Elites is the first transport service that feels truly premium. The rides are smooth, punctual, and stress-free.',
    },
    {
      name: 'Dr. Tariq M.',
      role: 'Faculty Member',
      text: 'Reliable, professional and consistent. I have depended on them for years and they never disappointed me.',
    },
    {
      name: 'Hassan R.',
      role: 'Student, FAST University',
      text: 'Everything is so easy now. I get updates, know my vehicle, and plan my day without worrying about transport.',
    },
  ];

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
                Eagle Elites
              </p>
              <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                Premium Transport
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-7 md:flex">
            <button className="text-sm text-zinc-400 transition hover:text-white">
              About
            </button>
            <button className="text-sm text-zinc-400 transition hover:text-white">
              Routes
            </button>
            <button className="text-sm text-zinc-400 transition hover:text-white">
              Reviews
            </button>
            <button className="text-sm text-zinc-400 transition hover:text-white">
              Contact
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/auth/login')}
              className="px-3 py-2 text-sm font-medium text-zinc-300 transition hover:text-white md:px-4"
            >
              Log In
            </button>
            <button
              onClick={() => router.push('/auth/signup')}
              className="rounded-xl bg-gradient-to-r from-[#facc15] to-[#fbbf24] px-4 py-2.5 text-sm font-bold text-black shadow-[0_12px_30px_rgba(250,204,21,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(250,204,21,0.32)]"
            >
              Sign Up
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
                Premium daily transport for students & professionals
              </div>

              <h1 className="max-w-xl text-5xl font-black leading-[0.98] tracking-[-0.06em] text-white md:text-6xl xl:text-7xl">
                Smooth rides.
                <span className="block text-[#facc15]">Smarter commutes.</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-400 md:text-xl">
                Eagle Elites delivers trusted, comfortable transport across
                Islamabad and Rawalpindi with a premium service experience from
                pickup to drop-off.
              </p>

              <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row">
                <button
                  onClick={() => router.push('/auth/signup')}
                  className="rounded-2xl bg-gradient-to-r from-[#facc15] to-[#fbbf24] px-7 py-4 text-base font-bold text-black shadow-[0_20px_40px_rgba(250,204,21,0.28)] transition hover:-translate-y-0.5"
                >
                  Book your seat →
                </button>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900/80 px-7 py-4 text-base font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-800"
                >
                  <span className="text-xl">💬</span>
                  WhatsApp us
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-2">
                  <span className="text-[#22c55e]">●</span>
                  Verified drivers
                </div>
                <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-2">
                  <span className="text-[#22c55e]">●</span>
                  Safe every day
                </div>
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
                    {routeHighlights.map((route) => (
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

        <section id="stats" className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[#facc15]">
                Trusted service
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-4">
              {[
                {
                  value: vehicles,
                  suffix: '+',
                  label: 'Premium vehicles',
                  icon: '🚐',
                },
                {
                  value: students,
                  suffix: '+',
                  label: 'Passengers served',
                  icon: '👥',
                },
                {
                  value: years,
                  suffix: '+',
                  label: 'Years of experience',
                  icon: '🏆',
                },
                {
                  value: 24,
                  suffix: '/7',
                  label: 'Support access',
                  icon: '📞',
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
                    {stat.value}
                    {stat.suffix}
                  </p>
                  <p className="mt-2 text-sm text-zinc-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#facc15]">
                Why choose us
              </p>
              <h2 className="text-4xl font-black tracking-[-0.05em] text-white md:text-5xl">
                Built for comfort,{' '}
                <span className="text-[#facc15]">confidence</span>, and daily
                ease.
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group rounded-[26px] border border-zinc-800 bg-zinc-900/75 p-6 transition hover:-translate-y-1 hover:border-[#facc15]/40 hover:bg-zinc-900"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#facc15]/10 text-2xl ring-1 ring-[#facc15]/15 transition group-hover:bg-[#facc15]/15">
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
            <div className="mb-12 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#facc15]">
                Simple process
              </p>
              <h2 className="text-4xl font-black tracking-[-0.05em] text-white md:text-5xl">
                How it works
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {[
                {
                  step: '01',
                  title: 'Choose your route',
                  desc: 'Select your pickup point, destination, and commute timing in minutes.',
                },
                {
                  step: '02',
                  title: 'Confirm your seat',
                  desc: 'Register quickly and lock in your transport schedule with ease.',
                },
                {
                  step: '03',
                  title: 'Ride with confidence',
                  desc: 'Enjoy on-time pickups, smooth travel, and a driver you can trust.',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-[28px] border border-zinc-800 bg-[linear-gradient(180deg,_rgba(15,23,42,0.86),_rgba(9,12,18,0.96))] p-6"
                >
                  <p className="mb-4 text-sm font-bold tracking-[0.28em] text-[#facc15]">
                    {item.step}
                  </p>
                  <h3 className="mb-3 text-2xl font-bold text-white">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-7 text-zinc-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#facc15]">
                Reviews
              </p>
              <h2 className="text-4xl font-black tracking-[-0.05em] text-white md:text-5xl">
                People love the{' '}
                <span className="text-[#facc15]">Eagle Elites</span> experience.
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.18)]"
                >
                  <div className="mb-4 flex gap-1 text-xl text-[#facc15]">
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <span key={starIndex}>★</span>
                    ))}
                  </div>
                  <p className="mb-6 text-sm leading-7 text-zinc-300">
                    “{testimonial.text}”
                  </p>
                  <div className="flex items-center gap-3 border-t border-zinc-800 pt-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#facc15]/15 text-sm font-black text-[#facc15]">
                      {testimonial.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {testimonial.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 pb-20 pt-10">
          <div className="mx-auto max-w-5xl">
            <div className="overflow-hidden rounded-[30px] border border-[#facc15]/20 bg-[linear-gradient(135deg,rgba(250,204,21,0.12),rgba(15,23,42,0.92),rgba(9,12,18,0.96))] p-8 shadow-[0_30px_80px_rgba(250,204,21,0.08)] md:p-12">
              <div className="flex flex-col items-center text-center md:text-left">
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.28em] text-[#facc15]">
                  Ready to ride?
                </p>
                <h2 className="text-4xl font-black tracking-[-0.05em] text-white md:text-5xl">
                  Move smarter with Eagle Elites.
                </h2>
                <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-300">
                  Enjoy a safer, smoother, and more comfortable travel
                  experience every day.
                </p>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <button
                    onClick={() => router.push('/auth/signup')}
                    className="rounded-2xl bg-[#facc15] px-8 py-4 text-base font-bold text-black shadow-[0_16px_38px_rgba(250,204,21,0.3)] transition hover:-translate-y-0.5"
                  >
                    Join now
                  </button>
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900/70 px-8 py-4 text-base font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-800"
                  >
                    <span>💬</span>
                    Chat on WhatsApp
                  </a>
                </div>
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
            <p className="text-sm text-zinc-500">
              Eagle Elites Transport © 2026
            </p>
          </div>

          <div className="flex items-center gap-5 text-sm text-zinc-500">
            <button
              onClick={() => router.push('/auth/login')}
              className="transition hover:text-white"
            >
              Student Login
            </button>
            <button
              onClick={() => router.push('/auth/signup')}
              className="transition hover:text-white"
            >
              Sign Up
            </button>
            <button
              onClick={() => router.push('/admin/login')}
              className="transition hover:text-white"
            >
              Admin
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
