'use client';

import Link from 'next/link';
import { useState } from 'react';

export type LiveRoute = { id: string; name: string; price: number };

const PICKUP_ZONES = [
  'Hassan Abdal',
  'Wah Cantt (Br 1–3)',
  'Gudwal / 26 Area',
  'Kohistan Enclave',
  'Wah Model Town',
  'New City Phase II',
  'GT Road / Taxila',
  'B-17 MultiGardens',
  'D-17 Society',
  'E-16 / Tarnol / G-15',
];

const VEHICLE_TYPES = [
  { name: 'Coaster', icon: '🚌' },
  { name: 'Toyota Hiace', icon: '🚐' },
  { name: 'Mercedes van', icon: '🚙' },
  { name: 'Executive Coaster', icon: '🚌' },
  { name: 'Hiace Grand Cabin', icon: '🚐' },
];

const ROUTE_LINK = (routeName: string) =>
  `https://wa.me/923225166580?text=${encodeURIComponent(`Hi Eagle Elites, I would like to ask about the ${routeName} route, its current fare, pickup points, and timings.`)}`;

const WHATSAPP_LINK =
  'https://wa.me/923225166580?text=Hi%20Eagle%20Elites%2C%20I%27d%20like%20to%20ask%20about%20student%20transport.';

function formatPrice(price: number) {
  return `PKR ${Number(price).toLocaleString('en-PK')}`;
}

export default function LandingPage({
  initialRoutes,
  routesAvailable,
}: {
  initialRoutes: LiveRoute[];
  routesAvailable: boolean;
}) {
  const routes = initialRoutes;
  const routesError = !routesAvailable;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#070b10] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#090d13]/90 backdrop-blur-xl">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-8"
        >
          <a href="#home" className="flex items-center gap-3 rounded-lg" onClick={closeMenu}>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 to-amber-500 font-black text-slate-950 shadow-lg shadow-yellow-500/10">
              EE
            </span>
            <span>
              <span className="block text-sm font-extrabold leading-tight">Eagles Elite</span>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-zinc-400">Transport Service</span>
            </span>
          </a>

          <div className="hidden items-center gap-7 md:flex">
            <a className="text-sm text-zinc-300 hover:text-white" href="#routes">Routes & fares</a>
            <a className="text-sm text-zinc-300 hover:text-white" href="#coverage">Pickup areas</a>
            <a className="text-sm text-zinc-300 hover:text-white" href="#how-it-works">How it works</a>
            <a className="text-sm text-zinc-300 hover:text-white" href="#contact">Contact</a>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/auth/login" className="rounded-xl px-3 py-2 text-sm text-zinc-300 hover:text-white">Log in</Link>
            <Link href="/auth/signup" className="rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-yellow-300">Start an application</Link>
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 text-xl md:hidden"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <span aria-hidden="true">{mobileMenuOpen ? '×' : '☰'}</span>
          </button>
        </nav>

        {mobileMenuOpen && (
          <div id="mobile-navigation" className="border-t border-white/10 bg-[#090d13] px-5 py-4 md:hidden">
            <div className="mx-auto grid max-w-7xl gap-1">
              {[
                ['Routes & fares', '#routes'],
                ['Pickup areas', '#coverage'],
                ['How it works', '#how-it-works'],
                ['Fleet', '#fleet'],
                ['Contact', '#contact'],
              ].map(([label, href]) => (
                <a key={href} href={href} onClick={closeMenu} className="rounded-xl px-3 py-3 text-sm text-zinc-200 hover:bg-white/5">
                  {label}
                </a>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
                <Link href="/auth/login" onClick={closeMenu} className="rounded-xl border border-white/15 px-3 py-3 text-center text-sm font-medium">Log in</Link>
                <Link href="/auth/signup" onClick={closeMenu} className="rounded-xl bg-yellow-400 px-3 py-3 text-center text-sm font-bold text-slate-950">Apply</Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        <section id="home" className="relative isolate scroll-mt-24 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_15%,rgba(250,204,21,0.14),transparent_32%),radial-gradient(circle_at_90%_75%,rgba(56,189,248,0.09),transparent_30%)]" />
          <div className="mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-16 lg:pb-28">
            <div>
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-yellow-300/20 bg-yellow-300/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-yellow-100">
                <span className="h-2 w-2 rounded-full bg-yellow-300" />
                Student and staff transport
              </p>
              <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.055em] sm:text-6xl xl:text-7xl">
                A simpler way to get to <span className="text-yellow-300">campus.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg sm:leading-8">
                Explore route fares and pickup areas around Islamabad, Rawalpindi, and Wah Cantt. Ask the team to confirm your stop, schedule, and availability before applying.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/auth/signup" className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-yellow-400 px-7 py-4 text-center font-bold text-slate-950 shadow-lg shadow-yellow-500/10 hover:-translate-y-0.5 hover:bg-yellow-300">
                  Start a transport application <span className="ml-2" aria-hidden="true">→</span>
                </Link>
                <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.03] px-7 py-4 font-semibold text-white hover:border-white/30 hover:bg-white/[0.07]">
                  Ask a question on WhatsApp
                </a>
              </div>
              <p className="mt-4 max-w-xl text-xs leading-5 text-zinc-400">
                Applying does not confirm a seat. The team will review your details and confirm route availability.
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="absolute -inset-8 -z-10 rounded-full bg-yellow-300/5 blur-3xl" />
              <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#0d131c]/90 p-5 shadow-2xl shadow-black/40 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-300">Plan your commute</p>
                    <h2 className="mt-2 text-2xl font-bold">Check the details first</h2>
                  </div>
                  <span className="rounded-2xl border border-white/10 bg-white/5 p-3 text-2xl" aria-hidden="true">🚌</span>
                </div>
                <div className="my-7 rounded-2xl border border-white/10 bg-[#080c12] p-5">
                  <div className="flex items-center gap-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-yellow-300/50 bg-yellow-300/10 text-sm text-yellow-200">1</span>
                    <div><p className="font-semibold">Find your route</p><p className="mt-1 text-sm text-zinc-400">Review the routes and fares listed below.</p></div>
                  </div>
                  <div className="ml-[17px] h-7 border-l border-dashed border-zinc-600" />
                  <div className="flex items-center gap-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-300/40 bg-sky-300/10 text-sm text-sky-200">2</span>
                    <div><p className="font-semibold">Confirm your stop and timing</p><p className="mt-1 text-sm text-zinc-400">Ask the team for current trip details.</p></div>
                  </div>
                  <div className="ml-[17px] h-7 border-l border-dashed border-zinc-600" />
                  <div className="flex items-center gap-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-300/10 text-sm text-emerald-200">3</span>
                    <div><p className="font-semibold">Submit your application</p><p className="mt-1 text-sm text-zinc-400">Account activation follows team review.</p></div>
                  </div>
                </div>
                <a href="#routes" className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-zinc-200 hover:border-yellow-300/40 hover:text-white">
                  Browse current route fares <span aria-hidden="true">↓</span>
                </a>
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-zinc-400">
                <span>Islamabad</span><span>Rawalpindi</span><span>Wah Cantt</span>
              </div>
            </div>
          </div>
        </section>

        <section id="routes" className="scroll-mt-24 border-y border-white/5 bg-white/[0.02] px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-9 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-yellow-300">Routes and fares</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">See the current route prices</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Prices shown are read from the route list. Confirm the fare, pickup point, schedule, and seat availability with the team before making a payment.</p>
              </div>
            </div>

            {routesError ? (
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-6">
                <h3 className="font-semibold text-amber-100">Route prices are temporarily unavailable</h3>
                <p className="mt-2 text-sm text-zinc-300">Message the team for a current fare and pickup details.</p>
                <a className="mt-4 inline-flex rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-yellow-300" href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">Ask for a fare</a>
              </div>
            ) : routes.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-zinc-300">No route fares are listed right now. Contact the team to ask about service in your area.</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {routes.map((route) => (
                  <article key={route.id} className="flex flex-col rounded-2xl border border-white/10 bg-[#0b1018] p-5 transition hover:-translate-y-0.5 hover:border-yellow-300/30">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Route fare</p>
                    <h3 className="mt-3 min-h-14 text-xl font-bold leading-7">{route.name}</h3>
                    <p className="mt-4 text-3xl font-black text-yellow-200">{formatPrice(route.price)}</p>
                    <p className="mt-1 text-xs text-zinc-500">Confirm fare period and included services with the team.</p>
                    <a href={ROUTE_LINK(route.name)} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:border-yellow-300/40 hover:bg-yellow-300/5">
                      Ask about this route <span className="ml-2" aria-hidden="true">↗</span>
                    </a>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="coverage" className="scroll-mt-24 px-5 py-20 sm:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-yellow-300">Pickup coverage</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Check whether we cover your area</h2>
              <p className="mt-4 text-sm leading-7 text-zinc-400">These are the pickup areas currently listed on the site. Coverage can vary by route and stop, so confirm your exact location with the team.</p>
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 hover:bg-zinc-200">Check my pickup point</a>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {PICKUP_ZONES.map((zone, i) => (
                <div key={zone} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-300/10 text-sm text-yellow-200" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-sm font-medium text-zinc-200">{zone}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 border-y border-white/5 bg-[#0a0e14] px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-yellow-300">Getting started</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Know what happens before you apply</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">The portal collects your commuting details and application. The team reviews applications before activating accounts.</p>
            </div>
            <div className="mt-9 grid gap-4 md:grid-cols-3">
              {[
                { n: '01', title: 'Ask about the route', body: 'Confirm the current fare, pickup stop, timing, vehicle, and available seats for your campus.' },
                { n: '02', title: 'Create your account', body: 'Enter your contact, institution, pickup preferences, and the information requested in the portal.' },
                { n: '03', title: 'Wait for review', body: 'Submit the requested payment proof and wait for the team to review and confirm your application.' },
              ].map((step) => (
                <article key={step.n} className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                  <span className="text-sm font-bold tracking-[0.16em] text-yellow-300">{step.n}</span>
                  <h3 className="mt-4 text-xl font-bold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{step.body}</p>
                </article>
              ))}
            </div>
            <p className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-4 text-sm leading-6 text-amber-100/90">Payment instructions appear during the application. Confirm the total amount and payment terms with the team before transferring money. Submitting an application does not itself reserve a seat.</p>
          </div>
        </section>

        <section id="fleet" className="scroll-mt-24 px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_85%_20%,rgba(250,204,21,0.08),transparent_35%),#0b1018] p-6 sm:p-9 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-yellow-300">Fleet</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight">Ask which vehicle serves your route</h2>
                <p className="mt-4 text-sm leading-7 text-zinc-400">Vehicle model and amenities can vary by route and availability. Contact the team to confirm the vehicle assigned to your trip.</p>
                <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold hover:border-yellow-300/40">Ask about the fleet <span className="ml-2" aria-hidden="true">↗</span></a>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {VEHICLE_TYPES.map((vehicle) => (
                  <div key={vehicle.name} className="flex min-h-32 flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                    <span className="text-4xl" aria-hidden="true">{vehicle.icon}</span>
                    <span className="mt-3 text-sm font-semibold text-zinc-200">{vehicle.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="scroll-mt-24 border-t border-white/5 bg-white/[0.02] px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-yellow-300">Contact</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Get the details for your commute</h2>
                <p className="mt-4 text-sm leading-7 text-zinc-400">Ask about route availability, exact pickup points, current timings, fares, and the vehicle assigned to your trip.</p>
                <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-yellow-300">Message Eagle Elites on WhatsApp</a>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <a href="tel:+923225166580" className="rounded-2xl border border-white/10 bg-[#0b1018] p-5 hover:border-yellow-300/30">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Call / WhatsApp</span>
                  <span className="mt-2 block text-lg font-bold">M. Hammad</span>
                  <span className="mt-1 block text-sm text-zinc-400">0322 5166580</span>
                </a>
                <a href="tel:+923135018125" className="rounded-2xl border border-white/10 bg-[#0b1018] p-5 hover:border-yellow-300/30">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Call / WhatsApp</span>
                  <span className="mt-2 block text-lg font-bold">Engr. Waleed</span>
                  <span className="mt-1 block text-sm text-zinc-400">0313 5018125</span>
                </a>
                <a href="mailto:eagleselitepk@gmail.com" className="rounded-2xl border border-white/10 bg-[#0b1018] p-5 hover:border-yellow-300/30 sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Email</span>
                  <span className="mt-2 block font-bold">eagleselitepk@gmail.com</span>
                </a>
                <div className="rounded-2xl border border-white/10 bg-[#0b1018] p-5 sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Office</span>
                  <span className="mt-2 block text-sm leading-6 text-zinc-200">Office 01, GT Road, Barrier No. 03, Wah Cantt, Pakistan</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-5 py-7 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold">Eagles Elite Transport Service (SMC) Pvt Ltd</p>
            <p className="mt-1 text-xs text-zinc-500">SECP Registered · License No. 023072</p>
            <p className="mt-2 text-xs text-zinc-500">© 2026 Eagles Elite Transport Service</p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-zinc-400">
            <Link href="/auth/login" className="hover:text-white">Student login</Link>
            <Link href="/auth/signup" className="hover:text-white">Apply</Link>
            <Link href="/admin/login" className="hover:text-white">Admin</Link>
            <a href="#home" className="hover:text-white">Back to top ↑</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
