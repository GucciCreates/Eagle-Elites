import Link from 'next/link';
import Icon, { type IconName } from '@/components/ui/icons';
import DayStory from '@/components/marketing/day-story';
import FareCalculator from '@/components/marketing/fare-calculator';
import SignupCta from '@/components/marketing/signup-cta';
import SiteFooter from '@/components/marketing/site-footer';
import SiteHeader from '@/components/marketing/site-header';
import TransitHero from '@/components/marketing/transit-hero';
import { BRAND, CONTACTS, WHATSAPP_GENERAL, whatsappLink } from '@/lib/brand';
import { formatPkr, EXPECTED_REVIEW_HOURS, RESERVATION_FEE, AC_SURCHARGE } from '@/lib/onboarding/pricing';
import { routeEnds } from '@/lib/public/coverage';
import { institutionLogo, institutionShortName, slugify } from '@/lib/public/institutions';
import type { LandingData } from '@/lib/public/landing-data';
import { seatBadge } from '@/lib/public/seats';

const VEHICLES = [
  { name: 'Coaster', note: 'Main campus runs' },
  { name: 'Executive Coaster', note: 'Extra legroom' },
  { name: 'Toyota Hiace', note: 'Smaller routes' },
  { name: 'Hiace Grand Cabin', note: 'High roof, AC' },
  { name: 'Mercedes van', note: 'Premium groups' },
];

const STEPS = [
  { title: 'Create your account', body: 'Sign up with Google in one tap, or with your email.' },
  { title: 'Pick route & pickup', body: 'Choose your campus, nearest stop, AC preference and class timings.' },
  { title: 'Pay & upload proof', body: 'Transfer the first payment and upload the receipt. Your reference number makes it easy to match.' },
  { title: 'Seat confirmed', body: `The team verifies your payment, usually within ${EXPECTED_REVIEW_HOURS} business hours. Then your seat, vehicle and driver show up in your dashboard.` },
];

const ALSO_IN_PORTAL: { icon: IconName; title: string }[] = [
  { icon: 'receipt', title: 'Fee status, receipts and payment history' },
  { icon: 'lifebuoy', title: 'Built-in help desk with tracked replies' },
  { icon: 'bell', title: 'Announcements and holiday notices' },
  { icon: 'gift', title: 'A free annual trip for registered passengers' },
];

const PARENT_POINTS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'shield', title: 'A registered company', body: `${BRAND.legalName}. ${BRAND.registration}.` },
  { icon: 'clipboard', title: 'Attendance on every trip', body: 'The driver marks each passenger present or absent as they board.' },
  { icon: 'user', title: 'A named driver, in advance', body: 'Each trip has an assigned driver and contact, visible before the ride.' },
  { icon: 'gps', title: 'GPS-tracked vehicles', body: 'Our vehicles are tracked by GPS on every route.' },
  { icon: 'users', title: 'Guardian on file', body: 'A parent or guardian contact is part of every application.' },
];

const FAQ = [
  {
    q: 'How much will I pay at the start?',
    a: `Your route’s monthly fee, plus a one-time ${formatPkr(RESERVATION_FEE)} reservation fee. AC vehicles add ${formatPkr(AC_SURCHARGE)} a month. The fare calculator shows your exact first payment.`,
  },
  {
    q: 'When are monthly fees due?',
    a: 'A reminder goes out on the 1st of each month and the fee is due by the 10th. Opted-in riders get both reminders on WhatsApp.',
  },
  {
    q: 'Does applying guarantee my seat?',
    a: `No. Your seat is confirmed once the team verifies your payment, usually within ${EXPECTED_REVIEW_HOURS} business hours. If a route is full you can join its waitlist.`,
  },
  {
    q: 'Can I change my pickup or drop-off time?',
    a: 'Yes. Set your weekly timetable from the dashboard, and change a trip time at least 8 hours before it leaves (once per day each week).',
  },
  {
    q: 'What if my application needs changes?',
    a: 'You’ll see exactly what to fix in your portal (and on WhatsApp if you opted in). Update it and resubmit, with no need to start over.',
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

function SectionHeading({ eyebrow, title, body, id }: { eyebrow: string; title: string; body?: string; id?: string }) {
  return (
    <div className="ee-reveal max-w-2xl">
      <p className="ee-mono text-[11px] uppercase tracking-[0.18em] text-yellow-200/80">{eyebrow}</p>
      <h2 id={id} className="ee-display mt-3 text-[2rem] text-white sm:text-[2.75rem]">{title}</h2>
      {body && <p className="mt-4 text-base leading-7 text-zinc-400">{body}</p>}
    </div>
  );
}

export default function LandingPage({ data }: { data: LandingData }) {
  const { routes, routesAvailable, pickupZones, pickupStops, institutions } = data;
  const lowestFare = routes.length ? Math.min(...routes.map((r) => r.price)) : null;

  const structuredData = [
    {
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
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
    },
  ];

  return (
    <div id="top" className="relative min-h-screen overflow-x-clip bg-[#070b10] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
      />
      <SiteHeader />

      <main>
        <TransitHero routes={routes} zones={pickupZones} stops={pickupStops} cities={BRAND.cities} registration={BRAND.registration} />

        {/* PROOF: facts, once each */}
        <section aria-label="Eagle Elites at a glance" className="border-y border-white/[0.07] bg-[#0a0e14]">
          <dl className="mx-auto grid max-w-7xl grid-cols-2 px-5 sm:px-8 md:grid-cols-4">
            {[
              ['SECP', BRAND.registration.replace('SECP Registered · ', '')],
              [routes.length ? String(routes.length) : '—', 'Active routes'],
              [String(pickupZones.length), 'Pickup areas'],
              ['15+', 'Institutions served'],
            ].map(([value, label], index) => (
              <div key={label} className={`py-6 md:py-8 ${index % 2 ? 'pl-5 md:pl-8' : ''} ${index > 1 ? 'border-t border-white/[0.07] md:border-t-0' : ''} ${index > 0 ? 'md:border-l md:border-white/[0.07] md:pl-8' : ''}`}>
                <dt className="sr-only">{label}</dt>
                <dd>
                  <span className="ee-display block text-3xl text-white sm:text-4xl">{value}</span>
                  <span className="ee-mono mt-1.5 block text-[11px] uppercase tracking-[0.14em] text-zinc-500">{label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* INSTITUTIONS */}
        <section aria-labelledby="campuses-title" className="px-5 py-12 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <p id="campuses-title" className="ee-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">Riding daily to</p>
            <ul className="mt-5 flex flex-wrap gap-2.5">
              {institutions.map((name) => {
                const logo = institutionLogo(name);
                return (
                  <li key={name}>
                    <Link href={`/campus/${slugify(name)}`} className="group flex min-h-12 items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 text-sm font-semibold text-zinc-300 transition hover:border-yellow-300/35 hover:text-white">
                      {logo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logo} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
                      )}
                      {institutionShortName(name)}
                      <Icon name="arrow-up-right" size={14} className="text-zinc-600 transition group-hover:text-yellow-300" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* FARES */}
        <section id="fares" aria-labelledby="fares-title" className="scroll-mt-20 px-5 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              id="fares-title"
              eyebrow="Routes & fares"
              title="Clear monthly fares. No surprises."
              body="Live prices from our route list. Pick your route, choose AC if you want it, and see your exact first payment."
            />

            {!routesAvailable || routes.length === 0 ? (
              <div className="mt-10 max-w-xl rounded-2xl border border-amber-300/20 bg-amber-300/5 p-6">
                <h3 className="font-semibold text-amber-100">
                  {routesAvailable ? 'Fares are being updated' : 'Route prices are temporarily unavailable'}
                </h3>
                <p className="mt-2 text-sm text-zinc-300">Message the team for a current fare and pickup details.</p>
                <a className="ee-btn ee-btn-whatsapp mt-4" href={WHATSAPP_GENERAL} target="_blank" rel="noopener noreferrer">
                  <Icon name="whatsapp" size={18} /> Ask for a fare
                </a>
              </div>
            ) : (
              <div className="mt-12 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
                {/* Departure-board style list, not a grid of identical cards. */}
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <div className="ee-mono hidden grid-cols-[1fr_auto_auto] gap-6 border-b border-white/10 bg-white/[0.03] px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-zinc-500 sm:grid">
                    <span>Route</span>
                    <span className="w-28 text-right">Monthly</span>
                    <span className="w-32 text-right">Seats</span>
                  </div>
                  <ul className="divide-y divide-white/[0.07]">
                    {routes.map((route) => {
                      const badge = seatBadge(route.seatsLeft);
                      const { from, to } = routeEnds(route.name);
                      return (
                        <li key={route.id} className="ee-reveal grid gap-3 px-5 py-4 transition hover:bg-white/[0.025] sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6">
                          <div className="min-w-0">
                            <p className="font-semibold text-white">
                              {from}
                              {to && (
                                <>
                                  <Icon name="arrow-right" size={14} className="mx-1.5 inline text-yellow-300" />
                                  {to}
                                </>
                              )}
                            </p>
                            <a
                              href={whatsappLink(`Hi Eagle Elites, I'd like to ask about the ${route.name} route: pickup points and timings.`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-flex min-h-8 items-center gap-1 text-xs font-medium text-zinc-500 hover:text-yellow-200"
                            >
                              Pickup points & timings <Icon name="arrow-up-right" size={12} />
                            </a>
                          </div>
                          <p className="ee-mono text-lg text-yellow-200 sm:w-28 sm:text-right">{formatPkr(route.price)}</p>
                          <div className="sm:w-32 sm:text-right">
                            {badge ? <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badge.tone}`}>{badge.text}</span> : <span className="text-xs text-zinc-500">Ask for seats</span>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="lg:sticky lg:top-24">
                  <FareCalculator routes={routes} />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* A DAY WITH EAGLE ELITES */}
        <section id="your-day" aria-labelledby="day-title" className="scroll-mt-20 border-t border-white/[0.07] bg-[#0a0e14] px-5 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              id="day-title"
              eyebrow="Your dashboard"
              title="A day with Eagle Elites"
              body="Everything about your commute lives in one place. Here’s how it fits into your week."
            />
            <DayStory />
            <ul className="mt-16 grid gap-x-8 gap-y-4 border-t border-white/[0.07] pt-8 sm:grid-cols-2 lg:grid-cols-4">
              {ALSO_IN_PORTAL.map((item) => (
                <li key={item.title} className="flex items-start gap-3 text-sm text-zinc-300">
                  <Icon name={item.icon} size={18} className="mt-0.5 shrink-0 text-yellow-200" />
                  {item.title}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* HOW IT WORKS: four stops on a line */}
        <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-20 px-5 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeading id="how-title" eyebrow="How it works" title="Four stops to your first ride" />
            <ol className="relative mt-12 grid gap-8 md:grid-cols-4 md:gap-6">
              <span aria-hidden="true" className="absolute bottom-4 left-[1.1rem] top-4 w-[3px] rounded-full bg-gradient-to-b from-yellow-300 to-yellow-500/40 md:bottom-auto md:left-4 md:right-4 md:top-[1.05rem] md:h-[3px] md:w-auto md:bg-gradient-to-r" />
              {STEPS.map((step, i) => (
                <li key={step.title} className="ee-reveal relative pl-14 md:pl-0">
                  <span className={`ee-mono absolute left-0 top-0 flex h-[2.4rem] w-[2.4rem] items-center justify-center rounded-full border-[3px] text-sm md:relative ${i === STEPS.length - 1 ? 'border-yellow-300 bg-yellow-300 text-[#15110a]' : 'border-yellow-300 bg-[#070b10] text-yellow-200'}`}>
                    {i === STEPS.length - 1 ? <Icon name="check" size={18} strokeWidth={2.4} /> : i + 1}
                  </span>
                  <h3 className="text-lg font-bold text-white md:mt-5">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{step.body}</p>
                </li>
              ))}
            </ol>
            <p className="mt-10 flex max-w-2xl items-start gap-3 rounded-2xl border border-yellow-300/20 bg-yellow-300/[0.05] px-5 py-4 text-sm leading-6 text-zinc-200">
              <Icon name="seat" size={20} className="mt-0.5 shrink-0 text-yellow-200" />
              Applying doesn&apos;t confirm a seat. Your seat is confirmed once your payment is verified.
            </p>
          </div>
        </section>

        {/* PARENTS */}
        <section id="parents" aria-labelledby="parents-title" className="scroll-mt-20 border-y border-white/[0.07] bg-[#0a0e14] px-5 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <SectionHeading
                id="parents-title"
                eyebrow="For parents"
                title="Know who’s driving. Know they boarded."
                body="Safety you can check, not just trust."
              />
              <ul className="mt-10 divide-y divide-white/[0.07] border-y border-white/[0.07]">
                {PARENT_POINTS.map((point) => (
                  <li key={point.title} className="ee-reveal flex gap-4 py-5">
                    <Icon name={point.icon} size={22} className="mt-0.5 shrink-0 text-emerald-300" />
                    <div>
                      <h3 className="font-semibold text-white">{point.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-zinc-400">{point.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <aside aria-label="Talk to a person" className="self-start rounded-[1.5rem] border border-white/10 bg-[#0d131b] p-6 sm:p-8 lg:sticky lg:top-24">
              <p className="ee-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">Talk to a person</p>
              <p className="mt-3 text-xl font-bold text-white">Questions about safety, routes or fees? Call us directly.</p>
              <ul className="mt-6 space-y-3">
                {CONTACTS.map((contact) => (
                  <li key={contact.e164} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <div>
                      <p className="font-semibold text-white">{contact.name}</p>
                      <p className="ee-mono mt-0.5 text-sm text-zinc-400">{contact.display}</p>
                    </div>
                    <div className="flex gap-2">
                      <a href={`tel:+${contact.e164}`} aria-label={`Call ${contact.name}`} className="ee-btn ee-btn-secondary h-12 w-12 px-0">
                        <Icon name="phone" size={18} />
                      </a>
                      <a href={`https://wa.me/${contact.e164}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${contact.name}`} className="ee-btn ee-btn-whatsapp h-12 w-12 px-0">
                        <Icon name="whatsapp" size={20} />
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-xs leading-5 text-zinc-500">24/7 support on WhatsApp.</p>
            </aside>
          </div>
        </section>

        {/* FLEET */}
        <section id="fleet" aria-labelledby="fleet-title" className="scroll-mt-20 px-5 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <SectionHeading
                id="fleet-title"
                eyebrow="Fleet"
                title="The right vehicle for every route"
                body="AC coasters, Hiaces and vans. The vehicle for your route is shown in your dashboard before each trip."
              />
              <ul className="mt-8 divide-y divide-white/[0.07] border-y border-white/[0.07]">
                {VEHICLES.map((vehicle) => (
                  <li key={vehicle.name} className="flex items-center justify-between gap-4 py-3.5">
                    <span className="font-semibold text-white">{vehicle.name}</span>
                    <span className="text-sm text-zinc-500">{vehicle.note}</span>
                  </li>
                ))}
              </ul>
            </div>
            <CoasterIllustration />
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 border-t border-white/[0.07] bg-[#0a0e14] px-5 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <SectionHeading id="faq-title" eyebrow="FAQ" title="Questions riders and parents ask" body="Still unsure? Message us on WhatsApp, any time." />
            <div className="divide-y divide-white/10 border-y border-white/10">
              {FAQ.map((item) => (
                <details key={item.q} className="group [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold text-white transition hover:text-yellow-100">
                    {item.q}
                    <Icon name="plus" size={20} className="shrink-0 text-yellow-300 transition-transform duration-300 group-open:rotate-45" />
                  </summary>
                  <p className="ee-enter max-w-2xl pb-6 text-sm leading-7 text-zinc-400">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section aria-labelledby="final-title" className="px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="ee-mono text-[11px] uppercase tracking-[0.18em] text-yellow-200/80">Next departure: your semester</p>
              <h2 id="final-title" className="ee-display mt-4 max-w-[16ch] text-[2.4rem] text-white sm:text-6xl">Seats fill up every semester. Reserve yours today.</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-zinc-400">It takes about five minutes. Use your Google account and you won’t even need a new password.</p>
            </div>
            <SignupCta />
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" aria-labelledby="contact-title" className="scroll-mt-20 border-t border-white/[0.07] px-5 py-16 sm:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
            <h2 id="contact-title" className="sr-only">Contact</h2>
            <a href={WHATSAPP_GENERAL} target="_blank" rel="noopener noreferrer" className="group flex min-h-20 items-center gap-4 rounded-2xl border border-white/10 p-5 transition hover:border-[#25d366]/50">
              <Icon name="whatsapp" size={26} className="shrink-0 text-[#25d366]" />
              <span>
                <span className="block font-semibold text-white">Chat on WhatsApp</span>
                <span className="block text-sm text-zinc-500">Routes, pickup points, fares</span>
              </span>
            </a>
            <a href={`mailto:${BRAND.email}`} className="flex min-h-20 items-center gap-4 rounded-2xl border border-white/10 p-5 transition hover:border-yellow-300/40">
              <Icon name="mail" size={24} className="shrink-0 text-yellow-200" />
              <span className="min-w-0">
                <span className="block font-semibold text-white">Email</span>
                <span className="block break-all text-sm text-zinc-500">{BRAND.email}</span>
              </span>
            </a>
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(BRAND.address)}`} target="_blank" rel="noopener noreferrer" className="flex min-h-20 items-center gap-4 rounded-2xl border border-white/10 p-5 transition hover:border-yellow-300/40">
              <Icon name="pin" size={24} className="shrink-0 text-yellow-200" />
              <span>
                <span className="block font-semibold text-white">Office</span>
                <span className="block text-sm text-zinc-500">{BRAND.address}</span>
              </span>
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

/** Side profile of a coaster: drawn, not stock photography. Replace with real fleet photos when available. */
function CoasterIllustration() {
  return (
    <figure className="ee-reveal relative">
      <svg viewBox="0 0 520 240" role="img" aria-label="Illustration of an Eagle Elites coaster" className="w-full">
        <defs>
          <linearGradient id="ee-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1b222c" />
            <stop offset="1" stopColor="#0f141b" />
          </linearGradient>
        </defs>
        <line x1="10" y1="206" x2="510" y2="206" stroke="rgba(255,255,255,0.12)" strokeWidth="2" strokeDasharray="14 10" />
        <path d="M40 70c0-17 13-30 30-30h330c26 0 44 10 58 32l26 42c6 10 9 21 9 33v29c0 10-8 18-18 18H58c-10 0-18-8-18-18V70Z" fill="url(#ee-body)" stroke="rgba(255,255,255,0.16)" strokeWidth="2" />
        <path d="M40 140h453" stroke="#e8bb40" strokeWidth="6" />
        <path d="M40 152h453" stroke="#e8bb40" strokeOpacity=".35" strokeWidth="2" />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={62 + i * 58} y="58" width="48" height="50" rx="8" fill="#0a0e14" stroke="rgba(255,255,255,0.14)" />
        ))}
        <path d="M418 58h18c14 0 25 7 32 19l18 31h-68V58Z" fill="#0a0e14" stroke="rgba(255,255,255,0.14)" />
        <rect x="362" y="58" width="40" height="112" rx="6" fill="#0a0e14" stroke="rgba(255,255,255,0.14)" />
        <text x="172" y="182" fill="#f1cf6c" fontSize="15" fontWeight="700" letterSpacing="2" fontFamily="var(--font-archivo), sans-serif">EAGLE ELITES</text>
        <circle cx="120" cy="200" r="24" fill="#070b10" stroke="#343b47" strokeWidth="6" />
        <circle cx="120" cy="200" r="8" fill="#525a68" />
        <circle cx="420" cy="200" r="24" fill="#070b10" stroke="#343b47" strokeWidth="6" />
        <circle cx="420" cy="200" r="8" fill="#525a68" />
        <rect x="486" y="150" width="10" height="16" rx="3" fill="#f1cf6c" />
      </svg>
      <figcaption className="mt-3 text-xs text-zinc-500">Illustration. Real fleet photos coming soon.</figcaption>
    </figure>
  );
}
