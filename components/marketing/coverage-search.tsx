'use client';

import { useId, useMemo, useState } from 'react';
import { whatsappLink } from '@/lib/brand';

export default function CoverageSearch({ zones }: { zones: string[] }) {
  const [query, setQuery] = useState('');
  const inputId = useId();
  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => (q ? zones.filter((z) => z.toLowerCase().includes(q)) : zones),
    [q, zones],
  );

  return (
    <div>
      <label htmlFor={inputId} className="sr-only">
        Search your area
      </label>
      <div className="relative">
        <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="9" r="6" /><path d="m14 14 4 4" strokeLinecap="round" /></svg>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type your sector or area, e.g. B-17 or Wah"
          className="min-h-14 w-full rounded-2xl border border-white/15 bg-[#0a0f16] pl-11 pr-4 text-base text-white placeholder:text-zinc-500 focus:border-yellow-300/60"
        />
      </div>

      <p className="mt-3 text-sm text-zinc-400" aria-live="polite">
        {q
          ? matches.length
            ? `Good news — we pick up in ${matches.length} matching area${matches.length === 1 ? '' : 's'}.`
            : 'Not listed yet. New stops are added as demand grows — tell us where you are.'
          : `${zones.length} pickup areas and counting.`}
      </p>

      {matches.length > 0 ? (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {matches.map((zone) => (
            <li key={zone} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-yellow-300 shadow-[0_0_0_4px_rgba(232,187,64,0.15)]" />
              <span className="text-sm font-medium text-zinc-200">{zone}</span>
            </li>
          ))}
        </ul>
      ) : (
        <a
          href={whatsappLink(`Hi Eagle Elites, do you pick up from ${query.trim()}? I'd like transport to campus.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 text-sm font-bold text-slate-950 hover:bg-zinc-200"
        >
          Request a stop at “{query.trim()}” ↗
        </a>
      )}
    </div>
  );
}
