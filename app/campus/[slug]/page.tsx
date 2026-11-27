import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteFooter from '@/components/marketing/site-footer';
import SiteHeader from '@/components/marketing/site-header';
import Icon from '@/components/ui/icons';
import { BRAND, whatsappLink } from '@/lib/brand';
import { formatPkr } from '@/lib/onboarding/pricing';
import { placeMatches, routeEnds } from '@/lib/public/coverage';
import { institutionShortName, slugify } from '@/lib/public/institutions';
import { getLandingData, type LiveRoute } from '@/lib/public/landing-data';
import { seatBadge } from '@/lib/public/seats';

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  const { institutions } = await getLandingData();
  return institutions.map((name) => ({ slug: slugify(name) }));
}

async function loadCampus(slug: string) {
  'use cache';
  cacheLife('minutes');
  const data = await getLandingData();
  const name = data.institutions.find((item) => slugify(item) === slug);
  if (!name) return null;
  const short = institutionShortName(name);
  // Routes whose destination names this campus, e.g. "Rawalpindi → H-11 / NUST".
  const direct = data.routes.filter((route) => {
    const to = routeEnds(route.name).to ?? route.name;
    return placeMatches(to, short) || placeMatches(to, name);
  });
  return { name, short, direct, routes: data.routes, institutions: data.institutions };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const campus = await loadCampus((await params).slug);
  if (!campus) return {};
  const from = campus.direct.length ? Math.min(...campus.direct.map((r) => r.price)) : null;
  return {
    title: `Transport to ${campus.short}`,
    description: `Daily student and staff transport to ${campus.name} from ${BRAND.cities.join(', ')}.${from !== null ? ` Monthly fares from ${formatPkr(from)}.` : ''} Reserve your seat with ${BRAND.name}.`,
    alternates: { canonical: `/campus/${(await params).slug}` },
  };
}

export default async function CampusPage({ params }: { params: Promise<Params> }) {
  'use cache';
  cacheLife('minutes');
  const { slug } = await params;
  const campus = await loadCampus(slug);
  if (!campus) notFound();

  const list: LiveRoute[] = campus.direct.length ? campus.direct : campus.routes;
  const ask = whatsappLink(`Hi Eagle Elites, I study at ${campus.name}. Which route and pickup point suits me?`);
  const others = campus.institutions.filter((item) => item !== campus.name);

  return (
    <div id="top" className="relative min-h-screen overflow-x-clip bg-[#070b10] text-white">
      <SiteHeader />
      <main>
        <section className="relative isolate px-5 pb-14 pt-10 sm:px-8 sm:pt-16">
          <div aria-hidden="true" className="ee-network-grid absolute inset-0 -z-10" />
          <div className="mx-auto max-w-7xl">
            <nav aria-label="Breadcrumb" className="ee-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">
              <Link href="/" className="hover:text-white">Home</Link> <span aria-hidden="true">/</span> Campuses <span aria-hidden="true">/</span>{' '}
              <span className="text-yellow-200">{campus.short}</span>
            </nav>
            <h1 className="ee-display mt-5 max-w-[16ch] text-[2.5rem] sm:text-6xl">
              Daily transport to <span className="text-yellow-300">{campus.short}</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300 sm:text-lg">
              Door-to-campus rides for {campus.name} students and staff, from pickup points across {BRAND.cities.join(', ')}. Set your week once and see your van and driver before every trip.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link prefetch={false} href="/auth/signup" className="ee-btn ee-btn-primary ee-btn-lg">
                Reserve my seat <Icon name="arrow-right" size={18} />
              </Link>
              <a href={ask} target="_blank" rel="noopener noreferrer" className="ee-btn ee-btn-secondary ee-btn-lg">
                <Icon name="whatsapp" size={20} className="text-[#25d366]" /> Which route suits me?
              </a>
            </div>
            <p className="mt-3 text-xs text-zinc-500">Applying doesn&apos;t confirm a seat. Your seat is confirmed once your payment is verified.</p>
          </div>
        </section>

        <section aria-labelledby="routes-title" className="border-t border-white/[0.07] bg-[#0a0e14] px-5 py-16 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="ee-mono text-[11px] uppercase tracking-[0.18em] text-yellow-200/80">Routes & fares</p>
            <h2 id="routes-title" className="ee-display mt-3 text-3xl sm:text-4xl">
              {campus.direct.length ? `Routes to ${campus.short}` : 'Our routes'}
            </h2>
            {!campus.direct.length && (
              <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
                Ask us which route stops closest to {campus.name}. We&apos;ll confirm the exact pickup point and timings.
              </p>
            )}
            {list.length ? (
              <ul className="mt-8 divide-y divide-white/[0.07] overflow-hidden rounded-2xl border border-white/10">
                {list.map((route) => {
                  const badge = seatBadge(route.seatsLeft);
                  const { from, to } = routeEnds(route.name);
                  return (
                    <li key={route.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                      <p className="font-semibold">
                        {from}
                        {to && (
                          <>
                            <Icon name="arrow-right" size={14} className="mx-1.5 inline text-yellow-300" />
                            {to}
                          </>
                        )}
                      </p>
                      <div className="flex items-center gap-4">
                        {badge && <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badge.tone}`}>{badge.text}</span>}
                        <span className="ee-mono text-lg text-yellow-200">{formatPkr(route.price)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <a href={ask} target="_blank" rel="noopener noreferrer" className="ee-btn ee-btn-whatsapp mt-6">
                <Icon name="whatsapp" size={18} /> Ask for a fare
              </a>
            )}
            <p className="mt-6 text-sm text-zinc-400">
              <Link href="/#home" className="font-semibold text-yellow-200 underline-offset-4 hover:underline">Check if your area is covered</Link> or{' '}
              <Link href="/#fares" className="font-semibold text-yellow-200 underline-offset-4 hover:underline">calculate your first payment</Link>.
            </p>
          </div>
        </section>

        {others.length > 0 && (
          <section aria-labelledby="other-campuses" className="px-5 py-14 sm:px-8">
            <div className="mx-auto max-w-7xl">
              <h2 id="other-campuses" className="ee-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">Other campuses we serve</h2>
              <ul className="mt-4 flex flex-wrap gap-2.5">
                {others.map((name) => (
                  <li key={name}>
                    <Link href={`/campus/${slugify(name)}`} className="flex min-h-12 items-center rounded-xl border border-white/[0.08] px-4 text-sm font-semibold text-zinc-300 transition hover:border-yellow-300/35 hover:text-white">
                      {institutionShortName(name)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>
      <SiteFooter whatsapp={ask} />
    </div>
  );
}
