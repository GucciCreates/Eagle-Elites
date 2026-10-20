'use client';

import { useState } from 'react';

export default function CopyButton({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(
            value.replace(/\s+/g, value.startsWith('PK') ? '' : ' '),
          );
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* clipboard blocked */
        }
      }}
      aria-label={`Copy ${label}`}
      className="flex-none rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-200 transition hover:border-yellow-400/60 hover:text-white"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}
