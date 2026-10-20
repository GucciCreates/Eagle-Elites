'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { compressImage, validateUpload } from '@/lib/upload/compress';

type Props = {
  label: string;
  hint?: string;
  file: File | null;
  onChange: (file: File | null) => void;
  onError: (message: string) => void;
  existingLabel?: string | null;
};

/** Camera capture or file/PDF picker with preview, replace and compression. */
export default function FilePicker({
  label,
  hint,
  file,
  onChange,
  onError,
  existingLabel,
}: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const preview = useMemo(
    () =>
      file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    [file],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const handle = async (input: HTMLInputElement) => {
    const picked = input.files?.[0];
    input.value = '';
    if (!picked) return;
    const problem = validateUpload(picked);
    if (problem) {
      onError(problem);
      return;
    }
    setBusy(true);
    const compressed = await compressImage(picked);
    setBusy(false);
    if (compressed.size > 5 * 1024 * 1024) {
      onError(
        'The file is still over 5 MB. Try a screenshot instead of a photo.',
      );
      return;
    }
    onError('');
    onChange(compressed);
  };

  const button =
    'flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm font-medium text-zinc-100 transition hover:border-yellow-400/60';

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-zinc-300">{label}</p>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void handle(e.currentTarget)}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => void handle(e.currentTarget)}
      />

      {file ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local blob preview
            <img
              src={preview}
              alt="Selected file preview"
              className="mb-3 max-h-56 w-full rounded-xl object-contain"
            />
          ) : (
            <p className="mb-3 rounded-xl bg-zinc-900 px-3 py-6 text-center text-sm text-zinc-300">
              📄 {file.name}
            </p>
          )}
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-400">
            <span className="truncate">
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-yellow-300 hover:text-yellow-200"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="text-zinc-400 hover:text-white"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {existingLabel && (
            <p className="mb-2 rounded-xl bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
              Current file: {existingLabel}. Choose a new one to replace it.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => cameraRef.current?.click()}
              className={`${button} sm:hidden`}
            >
              📷 Take photo
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className={button}
            >
              {busy ? 'Preparing…' : '📁 Choose file'}
            </button>
          </div>
        </>
      )}
      {hint && <p className="mt-2 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
