import type { SVGProps } from 'react';

/** Consistent 24px line icons (inherit colour via `currentColor`). */
export type IconName =
  | 'ticket'
  | 'calendar'
  | 'chat'
  | 'receipt'
  | 'lifebuoy'
  | 'gift'
  | 'bus'
  | 'van'
  | 'car'
  | 'shield'
  | 'pin'
  | 'clock'
  | 'check'
  | 'home'
  | 'route'
  | 'wallet'
  | 'help'
  | 'user'
  | 'bell'
  | 'users'
  | 'chart'
  | 'settings'
  | 'megaphone'
  | 'gps'
  | 'clipboard'
  | 'logout'
  | 'sun'
  | 'moon'
  | 'arrow-right'
  | 'arrow-left';

const PATHS: Record<IconName, string> = {
  ticket: 'M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4V8Zm11-2v12',
  calendar: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Zm0 4h16M8 3v4m8-4v4m-8 8h2m4 0h2',
  chat: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7l-4 3.5V17H6a2 2 0 0 1-2-2V6Zm4 4h8m-8 3h5',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6m-6 4h3',
  lifebuoy: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-6.4 3.4 3.6-3.6m5.6-5.6 3.6-3.6m0 12.8-3.6-3.6M8.8 8.8 5.2 5.2',
  gift: 'M4 11h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9Zm-1-4h18v4H3V7Zm9 0v14m0-14S10.5 3 8 3.5 7 7 12 7Zm0 0s1.5-4 4-3.5S17 7 12 7Z',
  bus: 'M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v12H5V5Zm0 7h14M8 17v3m8-3v3M8 14.5h.01M16 14.5h.01M5 7H3m18 0h-2',
  van: 'M3 7a2 2 0 0 1 2-2h10l5 5v6a1 1 0 0 1-1 1H3V7Zm0 4h17M15 5v6M7 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm10 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  car: 'M5 11l1.6-4.2A2 2 0 0 1 8.5 5.5h7a2 2 0 0 1 1.9 1.3L19 11m-14 0h14a1 1 0 0 1 1 1v4H4v-4a1 1 0 0 1 1-1Zm2 5v2m10-2v2M7.5 13.5h.01m9 0h.01',
  shield: 'M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Zm-3 9 2 2 4-4',
  pin: 'M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4l3 2',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  home: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 17h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16',
  wallet: 'M4 7a2 2 0 0 1 2-2h11v4M4 7v11a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H6a2 2 0 0 1-2-2Zm12 7.5h.01',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-2.5-11.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6m0 3h.01',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Zm4 4a2 2 0 0 0 4 0',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0m1-9a3 3 0 1 0-1-5.8M17 14a5 5 0 0 1 4 5',
  chart: 'M4 20h16M7 16v-4m5 4V8m5 8v-6',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.5 7.5 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-2.2-1.3L14.4 3h-4l-.4 2.4A7.4 7.4 0 0 0 7.8 6.7l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 2.2 1.3l.4 2.4h4l.4-2.4a7.4 7.4 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.3Z',
  megaphone: 'M4 10v4a1 1 0 0 0 1 1h3l8 4V5L8 9H5a1 1 0 0 0-1 1Zm4 5 1.5 5H12l-1-4.5M19 9.5a3 3 0 0 1 0 5',
  gps: 'M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm0-4a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0-12v2m0 14v2M3 12h2m14 0h2',
  clipboard: 'M9 4h6v3H9V4Zm-2 1H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1m-8 8 2 2 4-4',
  logout: 'M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4m-4 4h10',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-13v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4m0-12.8L17 7M7 17l-1.4 1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z',
  'arrow-right': 'M5 12h14m-5-5 5 5-5 5',
  'arrow-left': 'M19 12H5m5-5-5 5 5 5',
};

export default function Icon({
  name,
  size = 20,
  className,
  ...props
}: { name: IconName; size?: number } & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Rounded tile that frames an icon, used for feature lists and stat cards. */
export function IconTile({
  name,
  tone = 'gold',
  className = '',
}: {
  name: IconName;
  tone?: 'gold' | 'green' | 'blue' | 'red' | 'neutral';
  className?: string;
}) {
  const tones = {
    gold: 'border-yellow-300/20 bg-yellow-300/10 text-yellow-200',
    green: 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200',
    blue: 'border-sky-300/20 bg-sky-300/10 text-sky-200',
    red: 'border-red-300/20 bg-red-300/10 text-red-200',
    neutral: 'border-white/10 bg-white/[0.04] text-zinc-200',
  } as const;
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${tones[tone]} ${className}`}>
      <Icon name={name} size={20} />
    </span>
  );
}
