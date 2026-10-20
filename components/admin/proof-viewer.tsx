'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getProofSignedUrl,
  isPdfPath,
  toProofPath,
} from '@/lib/storage/proofs';

type Props = { value: string | null | undefined; label?: string };

/** Inline, zoomable preview of a private payment proof (signed URL). */
export default function ProofViewer({ value, label = 'Payment proof' }: Props) {
  const [supabase] = useState(() => createClient());
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const pdf = isPdfPath(toProofPath(value));

  useEffect(() => {
    let cancelled = false;
    void getProofSignedUrl(supabase, value).then((signed) => {
      if (cancelled) return;
      setUrl(signed);
      setState(signed ? 'ready' : 'error');
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, value]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (state === 'loading') {
    return (
      <div
        className="h-40 animate-pulse rounded-xl bg-zinc-800"
        aria-label="Loading proof"
      />
    );
  }
  if (state === 'error' || !url) {
    return (
      <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
        Couldn&apos;t load the proof file.
      </p>
    );
  }

  if (pdf) {
    return (
      <div className="space-y-2">
        <iframe
          src={url}
          title={label}
          className="h-64 w-full rounded-xl border border-zinc-700 bg-white"
        />
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-yellow-300 hover:text-yellow-200"
        >
          Open PDF in a new tab ↗
        </a>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setZoom(1);
          setOpen(true);
        }}
        className="group block w-full overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/50"
        aria-label={`${label}: open full size`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL */}
        <img
          src={url}
          alt={label}
          className="max-h-72 w-full object-contain transition group-hover:opacity-90"
        />
        <span className="block border-t border-zinc-800 px-3 py-1.5 text-left text-xs text-zinc-400">
          🔍 Tap to zoom
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="fixed inset-0 z-[100] flex flex-col bg-black/90"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex items-center justify-end gap-2 p-3"
            onClick={(e) => e.stopPropagation()}
          >
            {[
              ['−', () => setZoom((z) => Math.max(0.5, z - 0.5)), 'Zoom out'],
              ['+', () => setZoom((z) => Math.min(4, z + 0.5)), 'Zoom in'],
            ].map(([text, action, aria]) => (
              <button
                key={aria as string}
                type="button"
                aria-label={aria as string}
                onClick={action as () => void}
                className="h-10 w-10 rounded-lg bg-zinc-800 text-lg text-white hover:bg-zinc-700"
              >
                {text as string}
              </button>
            ))}
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-700"
            >
              Open ↗
            </a>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="h-10 w-10 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700"
            >
              ✕
            </button>
          </div>
          <div
            className="flex-1 overflow-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={label}
              style={{ width: `${zoom * 100}%` }}
              className="mx-auto max-w-none"
            />
          </div>
        </div>
      )}
    </>
  );
}
