'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Icon, { type IconName } from '@/components/ui/icons';

type Step = { time: string; title: string; body: string; icon: IconName; screen: ReactNode };

const DAYS = [
  ['Mon', '7:10', '4:30'],
  ['Tue', '8:40', '2:15'],
  ['Wed', '7:10', '4:30'],
  ['Thu', '10:10', '4:30'],
  ['Fri', '7:10', '12:30'],
] as const;

const STEPS: Step[] = [
  {
    time: 'Sunday night',
    title: 'Set your whole week in one go',
    body: 'Pick your stop and your morning and return times for each day, once. Classes moved on Thursday? Change just that day.',
    icon: 'calendar',
    screen: (
      <>
        <ScreenTitle eyebrow="My schedule" title="Next week" />
        <ul className="mt-3 space-y-1.5">
          {DAYS.map(([day, pickup, back]) => (
            <li key={day} className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
              <span className="text-xs font-semibold text-white">{day}</span>
              <span className="ee-mono text-[11px] text-zinc-300">
                {pickup} <span className="text-zinc-600">→</span> {back}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-500"><Icon name="pin" size={12} /> B-17 MultiGardens</p>
        <span className="mt-3 flex min-h-10 items-center justify-center rounded-xl bg-yellow-300 text-xs font-bold text-[#15110a]">Save my week</span>
      </>
    ),
  },
  {
    time: '6:45 AM',
    title: 'Know your van and driver before you leave',
    body: 'Your vehicle, driver and their number are in your dashboard before the trip. Confirm your seat in one tap.',
    icon: 'van',
    screen: (
      <>
        <ScreenTitle eyebrow="Today’s trip" title="Morning pickup · 7:10" />
        <div className="mt-3 rounded-2xl border border-yellow-300/20 bg-yellow-300/[0.06] p-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-300 text-[#15110a]"><Icon name="bus" size={20} /></span>
            <div>
              <p className="text-sm font-bold text-white">Coaster EE-12</p>
              <p className="text-[11px] text-zinc-400">AC · 26 seats</p>
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg bg-black/25 p-2"><dt className="text-zinc-500">Driver</dt><dd className="mt-0.5 font-semibold text-white">Your driver</dd></div>
            <div className="rounded-lg bg-black/25 p-2"><dt className="text-zinc-500">Contact</dt><dd className="ee-mono mt-0.5 text-white">03xx xxxxxxx</dd></div>
          </dl>
        </div>
        <span className="mt-3 flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-400/90 text-xs font-bold text-[#04170d]"><Icon name="check" size={14} /> Confirm my seat</span>
      </>
    ),
  },
  {
    time: 'Any time',
    title: 'WhatsApp keeps you posted',
    body: 'Your vehicle for the day, holidays, fee reminders and approvals arrive on WhatsApp, so you’re never guessing.',
    icon: 'chat',
    screen: (
      <>
        <ScreenTitle eyebrow="WhatsApp" title="Eagle Elites" />
        <div className="mt-3 space-y-2">
          <Bubble>Your ride for Monday is set: Coaster EE-12. Driver and contact are in your dashboard.</Bubble>
          <Bubble>Holiday notice: no service on 25 December (Quaid-e-Azam Day).</Bubble>
          <Bubble>Reminder: your December fee is due by the 10th.</Bubble>
        </div>
      </>
    ),
  },
];

function ScreenTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-yellow-200/80">{eyebrow}</p>
      <p className="mt-0.5 text-sm font-bold text-white">{title}</p>
    </div>
  );
}

function Bubble({ children }: { children: ReactNode }) {
  return <p className="max-w-[92%] rounded-2xl rounded-tl-md bg-[#1f2c33] px-3 py-2 text-[11px] leading-4 text-zinc-100">{children}</p>;
}

function Phone({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative mx-auto w-full max-w-[17.5rem] rounded-[2.4rem] border border-white/12 bg-[#05070a] p-2.5 shadow-[0_40px_90px_rgba(0,0,0,0.55)] ${className}`}>
      <div className="relative overflow-hidden rounded-[1.9rem] bg-[#0b1018] px-4 pb-5 pt-9">
        <span aria-hidden="true" className="absolute left-1/2 top-2.5 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
        <span className="absolute right-3 top-3 rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Sample</span>
        {children}
      </div>
    </div>
  );
}

/** "A day with Eagle Elites": three moments, with the matching dashboard screen. */
export default function DayStory() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    refs.current.forEach((node) => node && observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_0.8fr] lg:gap-20">
      <ol className="relative space-y-14 lg:space-y-[22vh] lg:py-[8vh]">
        <span aria-hidden="true" className="absolute bottom-2 left-[1.2rem] top-2 w-px bg-gradient-to-b from-yellow-300/60 via-white/10 to-transparent" />
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            ref={(node) => {
              refs.current[index] = node;
            }}
            data-index={index}
            className="relative pl-14"
          >
            <span aria-hidden="true" className={`absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-xl border transition-colors duration-300 ${active === index ? 'border-yellow-300/50 bg-yellow-300 text-[#15110a]' : 'border-white/10 bg-[#0b1018] text-zinc-400'}`}>
              <Icon name={step.icon} size={18} />
            </span>
            <p className="ee-mono text-[11px] uppercase tracking-[0.16em] text-yellow-200/80">{step.time}</p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">{step.title}</h3>
            <p className="mt-3 max-w-md text-base leading-7 text-zinc-400">{step.body}</p>
            <div className="mt-8 lg:hidden">
              <Phone>{step.screen}</Phone>
            </div>
          </li>
        ))}
      </ol>

      <div className="hidden lg:block">
        <div className="sticky top-[18vh]">
          <Phone>
            <div key={active} className="ee-enter">{STEPS[active].screen}</div>
          </Phone>
          <p className="mt-4 text-center text-xs text-zinc-500">Sample screens from the rider dashboard</p>
        </div>
      </div>
    </div>
  );
}
