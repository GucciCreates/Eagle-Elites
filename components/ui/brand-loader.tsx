import { BRAND } from '@/lib/brand';

/** Full-screen branded loading state with a skeleton preview of the page. */
export default function BrandLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="flex min-h-screen flex-1 items-center justify-center bg-[#06080c] px-5 text-white"
    >
      <div className="ee-enter w-full max-w-md">
        <div className="flex items-center gap-4">
          <span className="relative">
            <span aria-hidden="true" className="ee-glow absolute -inset-3 rounded-3xl bg-yellow-400/20 blur-xl" />
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG brand file */}
            <img src={BRAND.logoSrc} alt="" width={52} height={52} className="relative h-13 w-13 rounded-2xl" />
          </span>
          <div>
            <p className="font-semibold tracking-tight">{label}…</p>
            <p className="mt-0.5 text-sm text-zinc-500">{BRAND.name}</p>
          </div>
        </div>
        <div aria-hidden="true" className="mt-8 space-y-3">
          <div className="ee-skeleton h-28" />
          <div className="grid grid-cols-3 gap-3">
            <div className="ee-skeleton h-20" />
            <div className="ee-skeleton h-20" />
            <div className="ee-skeleton h-20" />
          </div>
          <div className="ee-skeleton h-40" />
        </div>
      </div>
    </main>
  );
}
