import { BRAND } from '@/lib/brand';

/** Brand mark plus optional wordmark. Swap the image file, not this code. */
export default function Logo({
  size = 44,
  showWordmark = true,
  subtitle = BRAND.tagline,
}: {
  size?: number;
  showWordmark?: boolean;
  subtitle?: string;
}) {
  return (
    <span className="inline-flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG brand file, no optimisation needed */}
      <img
        src={BRAND.logoSrc}
        alt={showWordmark ? '' : BRAND.name}
        width={size}
        height={size}
        className="shrink-0 rounded-2xl shadow-lg shadow-yellow-500/10"
        style={{ width: size, height: size }}
      />
      {showWordmark && (
        <span className="leading-tight">
          <span className="block text-sm font-extrabold tracking-tight text-white">
            {BRAND.name}
          </span>
          {subtitle && (
            <span className="block text-[10px] uppercase tracking-[0.2em] text-zinc-400">
              {subtitle}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
