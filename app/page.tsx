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

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !counted) {
        setCounted(true);
        animateCount(setVehicles, 35, 1500);
        animateCount(setStudents, 500, 2000);
        animateCount(setYears, 8, 1000);
      }
    });
    const el = document.getElementById('stats');
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [counted]);

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
      } else setter(Math.floor(current));
    }, duration / steps);
  };

  const whatsappNumber = '923225166580';
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=Hi%20Eagle%20Elites%2C%20I%27m%20interested%20in%20your%20transport%20service.`;

  const features = [
    {
      icon: '🛡️',
      title: 'Safe & Secure',
      desc: 'Every vehicle is regularly maintained and inspected. Student safety is our first priority on every trip.',
    },
    {
      icon: '⏱️',
      title: 'Always On Time',
      desc: 'Punctuality is built into how we operate. Your schedule is respected, every single day.',
    },
    {
      icon: '🚐',
      title: 'Premium Vehicles',
      desc: 'Modern, air-conditioned coasters and vans. Comfortable seating for students and faculty alike.',
    },
    {
      icon: '📱',
      title: 'Smart Portal',
      desc: 'Book your seat, check your driver, track your schedule and manage payments — all from your phone.',
    },
    {
      icon: '👨‍✈️',
      title: 'Professional Drivers',
      desc: 'Experienced, vetted drivers who know the routes and treat every passenger with respect.',
    },
    {
      icon: '🏫',
      title: 'University & Faculty',
      desc: 'Serving students, teachers and faculty across Islamabad and Rawalpindi routes daily.',
    },
  ];

  const testimonials = [
    {
      name: 'Ayesha K.',
      role: 'Student, Bahria University',
      text: 'Eagle Elites completely changed my daily commute. The driver is always on time and the coaster is clean and comfortable.',
    },
    {
      name: 'Dr. Tariq M.',
      role: 'Faculty Member',
      text: 'Reliable, professional and convenient. I have been using Eagle Elites for two years and have never been disappointed.',
    },
    {
      name: 'Hassan R.',
      role: 'Student, FAST University',
      text: "The new portal makes everything so easy. I can see my driver's name and vehicle number before I even leave home.",
    },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080808] text-white">
      <nav
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'border-b border-zinc-800 bg-zinc-900/95 shadow-xl backdrop-blur-md' : 'bg-transparent'}`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 shadow-lg shadow-yellow-400/20">
              <span className="text-sm font-black text-black">EE</span>
            </div>
            <div>
              <p className="text-sm font-bold leading-none text-white">
                Eagle Elites
              </p>
              <p className="text-xs text-zinc-500">Premium Transport</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/auth/login')}
              className="px-4 py-2 text-sm font-medium text-zinc-400 transition hover:text-white"
            >
              Log In
            </button>
            <button
              onClick={() => router.push('/auth/signup')}
              className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-black transition shadow-lg shadow-yellow-400/20 hover:bg-yellow-300"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      <section className="relative flex min-h-screen items-center justify-center px-6 pt-20">
        <div className="pointer-events-none absolute left-[5%] top-[10%] h-[600px] w-[600px] rounded-full bg-yellow-400 opacity-[0.04] blur-[150px]" />
        <div className="pointer-events-none absolute bottom-[10%] right-[5%] h-[400px] w-[400px] rounded-full bg-yellow-400 opacity-[0.03] blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
            <span className="text-sm font-medium text-yellow-400">
              Islamabad & Rawalpindi&apos;s Trusted Transport
            </span>
          </div>

          <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight text-white md:text-7xl">
            Eagle<span className="text-yellow-400"> Elites</span>
            <br />
            <span className="text-3xl font-bold text-zinc-400 md:text-5xl">
              Transport Services
            </span>
          </h1>

          <p className="mx-auto mb-4 max-w-2xl text-xl font-medium text-zinc-400 md:text-2xl">
            Your Journey.{' '}
            <span className="text-white">Our Responsibility.</span>
          </p>

          <p className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-zinc-500 md:text-lg">
            Premium transport for students, faculty and delegations across
            Islamabad and Rawalpindi. Safe, punctual and professional — every
            single day.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={() => router.push('/auth/signup')}
              className="w-full rounded-2xl bg-yellow-400 px-8 py-4 text-lg font-bold text-black shadow-2xl shadow-yellow-400/25 transition hover:-translate-y-0.5 hover:bg-yellow-300 sm:w-auto"
            >
              Book Your Seat →
            </button>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-800 px-8 py-4 text-lg font-bold text-white transition hover:border-zinc-500 hover:bg-zinc-700 sm:w-auto"
            >
              <span>💬</span> WhatsApp Us
            </a>
          </div>

          <div className="mt-16 flex flex-col items-center gap-2 animate-bounce">
            <p className="text-xs text-zinc-600">Scroll to explore</p>
            <div className="flex h-8 w-5 items-start justify-center rounded-full border-2 border-zinc-700 pt-1.5">
              <div className="h-2 w-1 rounded-full bg-yellow-400" />
            </div>
          </div>
        </div>
      </section>

      <section id="stats" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                value: vehicles,
                suffix: '+',
                label: 'Premium Vehicles',
                icon: '🚐',
                sub: 'Coasters & vans in our fleet',
              },
              {
                value: students,
                suffix: '+',
                label: 'Students & Faculty',
                icon: '👥',
                sub: 'Served daily across all routes',
              },
              {
                value: years,
                suffix: '+',
                label: 'Years of Service',
                icon: '🏆',
                sub: 'Trusted by Islamabad families',
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center transition hover:border-yellow-400/30 group"
              >
                <div className="mb-4 text-4xl">{stat.icon}</div>
                <p className="mb-2 text-5xl font-extrabold text-yellow-400">
                  {stat.value}
                  {stat.suffix}
                </p>
                <p className="mb-1 text-lg font-bold text-white">
                  {stat.label}
                </p>
                <p className="text-sm text-zinc-500">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
              Why Choose Eagle Elites
            </p>
            <h2 className="mb-4 text-4xl font-extrabold text-white md:text-5xl">
              Built Around <span className="text-yellow-400">Your Needs</span>
            </h2>
            <p className="mx-auto max-w-xl text-lg text-zinc-500">
              Everything we do is designed to make your daily commute safe,
              comfortable and stress-free.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 transition hover:border-yellow-400/30 hover:bg-zinc-900 group"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/10 text-2xl transition group-hover:bg-yellow-400/20">
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-lg font-bold text-white">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-500">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
              What People Say
            </p>
            <h2 className="mb-4 text-4xl font-extrabold text-white md:text-5xl">
              Trusted by <span className="text-yellow-400">Hundreds</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 transition hover:border-yellow-400/30"
              >
                <div className="mb-4 flex gap-1">
                  {[...Array(5)].map((_, starIndex) => (
                    <span key={starIndex} className="text-sm text-yellow-400">
                      ★
                    </span>
                  ))}
                </div>
                <p className="mb-6 text-sm leading-relaxed text-zinc-300">
                  &quot;{testimonial.text}&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-yellow-400/30 bg-yellow-400/20">
                    <span className="text-sm font-bold text-yellow-400">
                      {testimonial.name[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-zinc-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl border border-yellow-400/20 bg-gradient-to-br from-yellow-400/10 to-yellow-400/5 p-12 text-center">
            <div className="absolute left-1/2 top-0 h-[200px] w-[400px] -translate-x-1/2 rounded-full bg-yellow-400 opacity-[0.05] blur-[80px]" />
            <div className="relative z-10">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
                Ready to Ride?
              </p>
              <h2 className="mb-4 text-4xl font-extrabold text-white md:text-5xl">
                Join Eagle Elites Today
              </h2>
              <p className="mx-auto mb-8 max-w-lg text-lg text-zinc-400">
                Sign up in minutes and get access to premium transport with
                real-time updates on your phone.
              </p>
              <button
                onClick={() => router.push('/auth/signup')}
                className="rounded-2xl bg-yellow-400 px-10 py-4 text-lg font-bold text-black shadow-2xl shadow-yellow-400/25 transition hover:-translate-y-0.5 hover:bg-yellow-300"
              >
                Get Started — It&apos;s Free →
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
              Get In Touch
            </p>
            <h2 className="mb-4 text-4xl font-extrabold text-white">
              Have Questions?
            </h2>
            <p className="text-lg text-zinc-500">
              Reach out to us directly on WhatsApp. We respond fast.
            </p>
          </div>

          <div className="mx-auto flex max-w-lg flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-green-600 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-green-900/30 transition hover:bg-green-500 sm:w-auto"
            >
              <span className="text-2xl">💬</span>
              Chat on WhatsApp
            </a>
            <button
              onClick={() => router.push('/auth/signup')}
              className="w-full rounded-2xl bg-yellow-400 px-8 py-4 text-lg font-bold text-black shadow-xl shadow-yellow-400/20 transition hover:bg-yellow-300 sm:w-auto"
            >
              Sign Up Now →
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-zinc-600">
            📞 +92 322 5166580 · Available Mon–Sat, 7am–9pm
          </p>
        </div>
      </section>

      <footer className="border-t border-zinc-800 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-400">
              <span className="text-xs font-black text-black">EE</span>
            </div>
            <p className="text-sm text-zinc-500">
              Eagle Elites Transport © 2026
            </p>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push('/auth/login')}
              className="text-sm text-zinc-500 transition hover:text-white"
            >
              Student Login
            </button>
            <button
              onClick={() => router.push('/auth/signup')}
              className="text-sm text-zinc-500 transition hover:text-white"
            >
              Sign Up
            </button>
            <button
              onClick={() => router.push('/admin/login')}
              className="text-xs text-zinc-600 transition hover:text-zinc-400"
            >
              Admin
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
