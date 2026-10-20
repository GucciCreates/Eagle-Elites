'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';
import PasswordInput from '@/components/password-input';

export const inputClass =
  'w-full rounded-xl border bg-zinc-900/80 px-4 py-3 text-[15px] text-white placeholder:text-zinc-500 transition focus:outline-none focus:ring-2 disabled:opacity-60';

function stateClass(error?: string) {
  return error
    ? 'border-red-500/60 focus:border-red-400 focus:ring-red-500/20'
    : 'border-zinc-700/80 focus:border-yellow-400/80 focus:ring-yellow-400/20';
}

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  labelAction?: ReactNode;
  password?: boolean;
};

/** Labelled input with hint + inline error wired up for screen readers. */
export function Field({
  id,
  label,
  error,
  hint,
  labelAction,
  password,
  ...props
}: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;
  const shared = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    className: `${inputClass} ${stateClass(error)}`,
    ...props,
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-zinc-300">
          {label}
        </label>
        {labelAction}
      </div>
      {password ? <PasswordInput {...shared} /> : <input {...shared} />}
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs text-red-300">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-zinc-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Alert({
  tone,
  children,
}: {
  tone: 'error' | 'success' | 'info';
  children: ReactNode;
}) {
  const styles = {
    error: 'border-red-500/30 bg-red-500/10 text-red-200',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    info: 'border-yellow-400/25 bg-yellow-400/10 text-yellow-100',
  }[tone];

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`mb-5 rounded-xl border px-3.5 py-3 text-sm leading-6 ${styles}`}
    >
      {children}
    </div>
  );
}

export function SubmitButton({
  loading,
  loadingText,
  children,
  disabled,
}: {
  loading: boolean;
  loadingText: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      aria-busy={loading}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 px-4 py-3 font-semibold text-black shadow-[0_12px_28px_rgba(250,204,21,0.28)] transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1119] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading && (
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent"
        />
      )}
      <span>{loading ? loadingText : children}</span>
    </button>
  );
}

export const linkClass =
  'rounded font-medium text-yellow-400 transition hover:text-yellow-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/40';
