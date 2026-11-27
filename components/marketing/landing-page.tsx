import Link from 'next/link';
import Logo from '@/components/brand/logo';
import Icon, { IconTile, type IconName } from '@/components/ui/icons';
import CoverageSearch from '@/components/marketing/coverage-search';
import FareCalculator from '@/components/marketing/fare-calculator';
import SignupCta from '@/components/marketing/signup-cta';
import SiteHeader from '@/components/marketing/site-header';
import { BRAND, CONTACTS, WHATSAPP_GENERAL, whatsappLink } from '@/lib/brand';
import { formatPkr, EXPECTED_REVIEW_HOURS, RESERVATION_FEE, AC_SURCHARGE } from '@/lib/onboarding/pricing';
import type { LandingData } from '@/lib/public/landing-data';
import { seatBadge } from '@/lib/public/seats';

const VEHICLES = [
  { name: 'Coaster', note: 'Main campus runs', icon: 'bus' },
  { name: 'Executive Coaster', note: 'Extra legroom', icon: 'bus' },
  { name: 'Toyota Hiace', note: 'Smaller routes', icon: 'van' },
  { name: 'Hiace Grand Cabin', note: 'High roof, AC', icon: 'van' },
  { name: 'Mercedes van', note: 'Premium groups', icon: 'car' },
] satisfies { name: string; note: string; icon: IconName }[];

const STEPS = [
  { title: 'Create your account', body: 'Sign up with Google in one tap, or with your email.' },
  { title: 'Pick route & pickup', body: 'Choose your campus, nearest stop, AC preference and class timings.' },
  { title: 'Pay & upload proof', body: `Transfer the first payment and upload the receipt. Your reference number makes it easy to match.` },
  { title: 'Get approved & ride', body: `The team reviews applications within about ${EXPECTED_REVIEW_HOURS} business hours. Then your seat, vehicle and driver show up in your dashboard.` },
];

const PORTAL_FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'ticket', title: 'Daily seat confirmation', body: 'See tomorrow’s vehicle, driver and contact, and confirm your seat in a tap.' },
  { icon: 'calendar', title: 'Weekly timetable', body: 'Set arrival and departure per day to match your classes. Change a trip up to 8 hours before it.' },
  { icon: 'chat', title: 'WhatsApp alerts', body: 'Approvals, fee reminders, holidays and vehicle changes come straight to WhatsApp.' },
  { icon: 'receipt', title: 'Payments in one place', body: 'Monthly fee status, receipts and history — no more chasing screenshots.' },
  { icon: 'lifebuoy', title: 'Built-in help desk', body: 'Raise an issue from your dashboard and track the reply.' },
  { icon: 'gift', title: 'Free annual trip', body: 'Registered passengers get a free annual trip with us.' },
];

const SAFETY: { icon: IconName; title: string; body: string }[] = [
  { icon: 'gps', title: 'Live GPS tracking', body: 'Know where the vehicle is — no more waiting at the stop guessing.' },
  { icon: 'clipboard', title: 'Attendance on every trip', body: 'Drivers mark each passenger present or absent as they board.' },
  { icon: 'users', title: 'Guardian on file', body: 'A parent or guardian contact is part of every application.' },
  { icon: 'user', title: 'Assigned, registered drivers', body: 'Each trip has a named driver and contact you can see in advance.' },
  { icon: 'chat', title: '24/7 WhatsApp support', body: 'A real person on WhatsApp, any time of day.' },
  { icon: 'shield', title: 'Registered company', body: `${BRAND.legalName}. ${BRAND.registration}.` },
];

const FAQ = [
  {
    q: 'How much will I pay at the start?',
    a: `Your route’s monthly fee, plus a one-time ${formatPkr(RESERVATION_FEE)} reservation fee. AC vehicles add ${formatPkr(AC_SURCHARGE)} a month. Use the fare calculator above to see your exact first payment.`,
  },
  {
    q: 'When are monthly fees due?',
    a: 'A reminder goes out on the 1st of each month and the fee is due by the 10th. Opted-in riders get both reminders on WhatsApp.',
  },
  {
    q: 'Does applying guarantee my seat?',
    a: `Not yet — the team checks your details and payment proof first, usually within ${EXPECTED_REVIEW_HOURS} business hours. If a route is full you can join its waitlist.`,
  },
  {
    q: 'Can I change my pickup or drop-off time?',
    a: 'Yes. Set your weekly timetable from the dashboard, and change a trip time at least 8 hours before it leaves (once per day each week).',
  },
  {
    q: 'What if my application needs changes?',
    a: 'You’ll see exactly what to fix in your portal (and on WhatsApp if you opted in). Update it and resubmit — no need to start over.',
  },
  {
    q: 'Do you serve faculty and staff?',
    a: 'Yes. Faculty and staff can apply through the same portal and choose their institution.',
  },
  {
    q: 'What about holidays and cancelled classes?',
    a: 'Holidays are announced in the portal and on WhatsApp, so you’ll know before you leave home.',
  },
];

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="ee-reveal max-w-2xl">
      <p className="ee-eyebrow">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-balance sm:text-4xl">{title}</h2>
      {body && <p className="mt-3 text-sm leading-7 text-zinc-400 sm:text-base">{body}</p>}
    </div>
  );
}

function LiveTripCard() {
  const stops = [
    { name: 'Pickup · B-17', time: '7:05 AM', done: true },
    { name: 'GT Road', time: '7:25 AM', done: true },
    { name: 'Campus gate', time: '7:50 AM', done: false },
  ];
  return (
    <div className="ee-enter relative mx-auto w-full max-w-md [animation-delay:200ms]">
      <div aria-hidden="true" className="ee-glow absolute -inset-10 -z-10 rounded-full bg-yellow-300/10 blur-3xl" />
      <div className="ee-float overflow-hidden rounded-[2rem] border border-white/10 bg-[#0d131c]/95 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between border-b border-dashed border-white/15 px-6 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">Boarding pass</p>
            <p className="mt-1 text-lg font-black">Coaster 12 · Morning run</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200">
            <span className="ee-pulse h-2 w-2 shrink-0 rounded-full bg-emerald-300" /> Live GPS
          </span>
        </div>

        <div className="relative px-6 py-6">
          <div aria-hidden="true" className="absolute bottom-10 left-[35px] top-10 w-0.5 bg-gradient-to-b from-yellow-300 via-yellow-300/60 to-zinc-700" />
          <div aria-hidden="true" className="ee-ride absolute left-[27px] flex h-[18px] w-[18px] items-center justify-center rounded-full bg-yellow-300 text-[10px] shadow-[0_0_0_6px_rgba(232,187,64,0.18)]">
            ▲
          </div>
          <ol className="relative space-y-6">
            {stops.map((stop) => (
              <li key={stop.name} className="flex items-center gap-4">
                <span className={`h-3 w-3 shrink-0 rounded-full border-2 ${stop.done ? 'border-yellow-300 bg-yellow-300' : 'border-zinc-500 bg-[#0d131c]'} ml-[5px]`} />
                <span className="flex flex-1 items-center justify-between gap-3">
                  <span className={`text-sm font-semibold ${stop.done ? 'text-white' : 'text-zinc-400'}`}>{stop.name}</span>
                  <span className="text-xs tabular-nums text-zinc-500">{stop.time}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="grid grid-cols-3 border-t border-white/10 text-center text-xs">
          <div className="border-r border-white/10 px-3 py-4">
            <p className="text-zinc-500">Driver</p>
            <p className="mt-1 font-semibold text-zinc-200">Assigned</p>
          </div>
          <div className="border-r border-white/10 px-3 py-4">
            <p className="text-zinc-500">Seat</p>
            <p className="mt-1 font-semibold text-emerald-200">Confirmed ✓</p>
          </div>
          <div className="px-3 py-4">
            <p className="text-zinc-500">ETA</p>
            <p className="mt-1 font-semibold text-yellow-200">12 min</p>
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-zinc-500">Example of what you see in your rider dashboard</p>
    </div>
  );
}

export default function LandingPage({ data }: { data: LandingData }) {
  const { routes, routesAvailable, pickupZones, institutions } = data;
  const lowestFare = routes.length ? Math.min(...routes.map((r) => r.price)) : null;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: BRAND.name,
    legalName: BRAND.legalName,
    description: 'Daily student and staff transport to universities across Islamabad, Rawalpindi and Wah Cantt.',
    email: BRAND.email,
    telephone: `+${CONTACTS[0].e164}`,
    address: { '@type': 'PostalAddress', streetAddress: 'Office 01, GT Road, Barrier No. 03', addressLocality: 'Wah Cantt', addressCountry: 'PK' },
    areaServed: BRAND.cities,
    ...(lowestFare !== null && { priceRange: `From ${formatPkr(lowestFare)} / month` }),
  };

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#070b10] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
      />
      <SiteHeader />

      <main>
        {/* HERO */}
        <section id="home" className="relative isolate -mt-[68px] scroll-mt-24 overflow-hidden pt-[68px]">
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_10%,rgba(232,187,64,0.16),transparent_34%),radial-gradient(circle_at_92%_70%,rgba(56,189,248,0.10),transparent_32%)]" />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(circle_at_30%_30%,black,transparent_70%)]" />
          <div className="mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-8 sm:px-8 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pb-28">
            <div className="ee-stagger">
              <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-300/[0.06] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-yellow-100">
                <span className="ee-pulse h-2 w-2 shrink-0 rounded-full bg-yellow-300" />
                Admissions open<span className="hidden sm:inline">· {BRAND.cities.join(' · ')}</span>
              </p>
              <h1 className="max-w-3xl text-[2.75rem] font-black leading-[0.98] tracking-[-0.05em] text-balance sm:text-6xl xl:text-7xl">
                Your daily ride to campus, <span className="ee-gold-text">handled.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-zinc-300 sm:text-lg sm:leading-8">
                Door-to-campus transport for students and staff, with live GPS, your own timetable, and WhatsApp updates. Book your seat in minutes{lowestFare !== null ? `, from ${formatPkr(lowestFare)} a month` : ''}.
              </p>

              <div className="mt-8">
                <SignupCta />
              </div>

              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-zinc-300">
                {['SECP registered', 'Live GPS tracking', '24/7 WhatsApp support'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span aria-hidden="true" className="text-yellow-300">✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>

            <LiveTripCard />
          </div>
        </section>

        {/* STATS */}
        <section aria-label="Eagle Elites at a glance" className="border-y border-white/[0.06] bg-white/[0.02]">
          <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden px-5 sm:px-8 md:grid-cols-4">
            {[
              ['15+', 'Institutions served'],
              [routes.length ? String(routes.length) : '—', 'Active routes'],
              [String(pickupZones.length), 'Pickup areas'],
              ['24/7', 'WhatsApp support'],
            ].map(([value, label]) => (
              <div key={label} className="px-2 py-8 text-center">
                <dt className="sr-only">{label}</dt>
                <dd>
                  <span className="block text-3xl font-black tracking-tight text-yellow-200 sm:text-4xl">{value}</span>
                  <span className="mt-1 block text-xs uppercase tracking-[0.16em] text-zinc-500">{label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* INSTITUTIONS */}
        <section aria-label="Institutions we serve" className="py-10">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Riding daily to</p>
          <div className="ee-marquee-mask mt-5 overflow-hidden">
            <ul className="ee-marquee flex w-max gap-3">
              {[...institutions, ...institutions].map((name, i) => (
                <li
                  key={`${name}-${i}`}
                  aria-hidden={i >= institutions.length}
                  className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-zinc-300"
                >
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FARES */}
        <section id="fares" className="scroll-mt-24 px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Routes & fares"
              title="Clear monthly fares. No surprises."
              body="Live prices from our route list. Pick your route, choose AC if you want it, and see your exact first payment."
            />

            {!routesAvailable || routes.length === 0 ? (
              <div className="mt-10 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-6">
                <h3 className="font-semibold text-amber-100">
                  {routesAvailable ? 'Fares are being updated' : 'Route prices are temporarily unavailable'}
                </h3>
                <p className="mt-2 text-sm text-zinc-300">Message the team for a current fare and pickup details — we reply fast.</p>
                <a className="mt-4 inline-flex rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-yellow-300" href={WHATSAPP_GENERAL} target="_blank" rel="noopener noreferrer">
                  Ask for a fare
                </a>
              </div>
            ) : (
              <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
                <div className="grid gap-3 sm:grid-cols-2">
                  {routes.map((route) => {
                    const badge = seatBadge(route.seatsLeft);
                    return (
                      <article key={route.id} className="ee-reveal ee-lift group flex flex-col rounded-2xl border border-white/10 bg-[#0b1018] p-5 hover:border-yellow-300/30">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-lg font-bold leading-6">{route.name}</h3>
                          {badge && <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.tone}`}>{badge.text}</span>}
                        </div>
                        <p className="mt-4 text-2xl font-black text-yellow-200">
                          {formatPkr(route.price)} <span className="text-sm font-medium text-zinc-500">/ month</span>
                        </p>
                        <a
                          href={whatsappLink(`Hi Eagle Elites, I'd like to ask about the ${route.name} route: pickup points and timings.`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 text-sm font-semibold text-zinc-400 transition group-hover:text-yellow-200"
                        >
                          Pickup points & timings ↗
                        </a>
                      </article>
                    );
                  })}
                </div>
                <div className="lg:sticky lg:top-24">
                  <FareCalculator routes={routes} />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* COVERAGE */}
        <section id="coverage" className="scroll-mt-24 border-y border-white/[0.06] bg-[#0a0e14] px-5 py-20 sm:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <SectionHeading
                eyebrow="Pickup coverage"
                title="Is your area covered?"
                body="Search your sector, town or society. Not listed? Request a stop — routes grow where riders are."
              />
              <a href={WHATSAPP_GENERAL} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-12 items-center rounded-xl border border-white/15 px-5 text-sm font-semibold hover:border-yellow-300/40">
                Confirm my exact stop ↗
              </a>
            </div>
            <CoverageSearch zones={pickupZones} />
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="scroll-mt-24 px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading eyebrow="How it works" title="From sign-up to your first ride in four steps" />
            <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <li key={step.title} className="ee-reveal ee-lift relative rounded-2xl border border-white/10 bg-white/[0.025] p-6 hover:border-yellow-300/25">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 text-sm font-black text-slate-950">{i + 1}</span>
                  <h3 className="mt-5 text-lg font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* PORTAL */}
        <section className="px-5 pb-20 sm:px-8">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_90%_10%,rgba(232,187,64,0.10),transparent_40%),#0b1018] p-6 sm:p-10">
            <SectionHeading
              eyebrow="Your rider portal"
              title="Everything about your commute, in one place"
              body="No more spreadsheets, group-chat screenshots or guessing which coaster to board."
            />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PORTAL_FEATURES.map((f) => (
                <article key={f.title} className="ee-reveal ee-lift rounded-2xl border border-white/10 bg-black/20 p-5 hover:border-yellow-300/25">
                  <IconTile name={f.icon} />
                  <h3 className="mt-4 font-bold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{f.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* SAFETY */}
        <section id="safety" className="scroll-mt-24 border-y border-white/[0.06] bg-white/[0.02] px-5 py-20 sm:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <SectionHeading
              eyebrow="For parents"
              title="Safety you can check, not just trust"
              body="Every ride is tracked, every passenger is accounted for, and someone is always reachable."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {SAFETY.map((s) => (
                <div key={s.title} className="ee-reveal ee-lift flex gap-4 rounded-2xl border border-white/10 bg-[#0b1018] p-5 hover:border-emerald-300/25">
                  <IconTile name={s.icon} tone="green" />
                  <div>
                    <h3 className="font-bold">{s.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FLEET */}
        <section id="fleet" className="scroll-mt-24 px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Fleet"
              title="The right vehicle for every route"
              body="AC coasters, Hiaces and vans. The vehicle for your route is shown in your dashboard before each trip."
            />
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {VEHICLES.map((v) => (
                <div key={v.name} className="ee-reveal ee-lift group flex flex-col items-center rounded-2xl border border-white/10 bg-[#0b1018] p-6 text-center hover:border-yellow-300/25">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-300/10 text-yellow-200 transition-transform duration-300 group-hover:scale-110"><Icon name={v.icon} size={30} /></span>
                  <span className="mt-3 text-sm font-bold text-zinc-100">{v.name}</span>
                  <span className="mt-1 text-xs text-zinc-500">{v.note}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24 border-t border-white/[0.06] bg-[#0a0e14] px-5 py-20 sm:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.7fr_1.3fr]">
            <SectionHeading eyebrow="FAQ" title="Questions riders and parents ask" body="Still unsure? Message us on WhatsApp — we answer around the clock." />
            <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#0b1018]">
              {FAQ.map((item) => (
                <details key={item.q} className="group px-5 py-1 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold">
                    {item.q}
                    <span aria-hidden="true" className="text-xl text-yellow-300 transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="ee-enter pb-5 text-sm leading-7 text-zinc-400">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="px-5 py-20 sm:px-8">
          <div className="ee-reveal relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] border border-yellow-300/20 bg-[radial-gradient(circle_at_50%_0%,rgba(232,187,64,0.22),transparent_60%),#0b1018] px-6 py-14 text-center sm:px-12">
            <h2 className="mx-auto max-w-2xl text-3xl font-black tracking-tight text-balance sm:text-5xl">Seats fill up every semester. Reserve yours today.</h2>
            <p className="mx-auto mt-4 max-w-xl text-zinc-300">It takes about five minutes. Use your Google account and you won’t even need a new password.</p>
            <div className="mt-8">
              <SignupCta align="center" />
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className="scroll-mt-24 border-t border-white/[0.06] bg-white/[0.02] px-5 py-20 sm:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <SectionHeading eyebrow="Contact" title="Talk to a real person" body="Route availability, exact pickup points, timings, fares or anything else — we’re a message away." />
              <a href={WHATSAPP_GENERAL} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-[#25D366] px-5 text-sm font-bold text-slate-950 hover:brightness-110">
                Chat on WhatsApp
              </a>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {CONTACTS.map((c) => (
                <a key={c.e164} href={`tel:+${c.e164}`} className="rounded-2xl border border-white/10 bg-[#0b1018] p-5 hover:border-yellow-300/30">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Call / WhatsApp</span>
                  <span className="mt-2 block text-lg font-bold">{c.name}</span>
                  <span className="mt-1 block text-sm text-zinc-400">{c.display}</span>
                </a>
              ))}
              <a href={`mailto:${BRAND.email}`} className="rounded-2xl border border-white/10 bg-[#0b1018] p-5 hover:border-yellow-300/30 sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Email</span>
                <span className="mt-2 block break-all font-bold">{BRAND.email}</span>
              </a>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(BRAND.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-white/10 bg-[#0b1018] p-5 hover:border-yellow-300/30 sm:col-span-2"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Office · open in Maps ↗</span>
                <span className="mt-2 block text-sm leading-6 text-zinc-200">{BRAND.address}</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-5 pb-24 pt-10 sm:px-8 md:pb-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <Logo />
            <p className="mt-4 text-sm font-semibold text-zinc-300">{BRAND.legalName}</p>
            <p className="mt-1 text-xs text-zinc-500">{BRAND.registration}</p>
            <p className="mt-1 text-xs text-zinc-500">© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm text-zinc-400">
            <p className="col-span-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600 sm:col-span-1">Riders</p>
            <p className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600 sm:block">Staff</p>
            <Link href="/auth/signup" className="hover:text-white">Book a seat</Link>
            <Link href="/admin/login" className="hover:text-white">Admin portal</Link>
            <Link href="/auth/login" className="hover:text-white">Rider login</Link>
            <Link href="/driver/login" className="hover:text-white">Driver portal</Link>
            <a href="#faq" className="hover:text-white">FAQ</a>
            <a href="#home" className="hover:text-white">Back to top ↑</a>
          </div>
        </div>
      </footer>

      {/* Mobile sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#070b10]/95 p-3 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-2 gap-2">
          <a href={WHATSAPP_GENERAL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#25D366] text-sm font-bold text-slate-950">
            WhatsApp us
          </a>
          <Link href="/auth/signup" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-yellow-400 text-sm font-bold text-slate-950">
            Book my seat
          </Link>
        </div>
      </div>

      {/* Desktop floating WhatsApp */}
      <a
        href={WHATSAPP_GENERAL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Eagle Elites on WhatsApp"
        className="fixed bottom-6 right-6 z-40 hidden h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-xl shadow-black/40 transition hover:scale-105 md:flex"
      >
        <svg viewBox="0 0 32 32" className="h-7 w-7" fill="#0b141a" aria-hidden="true">
          <path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3Zm0 23.6c-2 0-4-.6-5.7-1.6l-.4-.2-3.9 1 1-3.8-.2-.4A10.6 10.6 0 1 1 16 26.6Zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.7 8.7 0 0 1-4.3-3.8c-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.3 6.3 0 0 0 1.3 3.3 14.4 14.4 0 0 0 5.5 4.9c2 .9 2.8 1 3.9.8a3.3 3.3 0 0 0 2.1-1.5 2.7 2.7 0 0 0 .2-1.5c-.1-.1-.3-.2-.6-.3Z" />
        </svg>
      </a>
    </div>
  );
}
