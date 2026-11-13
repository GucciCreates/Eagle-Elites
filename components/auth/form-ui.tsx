'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';
import PasswordInput from '@/components/password-input';

export const inputClass =
  'w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 disabled:opacity-60';

function stateClass(error?: string) {
  return error
    ? 'border-red-500/60 focus:border-red-400 focus:ring-red-500/20'
    : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100';
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
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        {labelAction}
      </div>
      {password ? <PasswordInput {...shared} /> : <input {...shared} />}
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-slate-500">
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
    error: 'border-red-500/20 bg-red-50 text-red-700',
    success: 'border-emerald-500/20 bg-emerald-50 text-emerald-700',
    info: 'border-violet-500/20 bg-violet-50 text-violet-700',
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
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-500 px-4 py-3 font-semibold text-white shadow-[0_12px_30px_rgba(109,40,217,0.24)] transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading && (
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
        />
      )}
      <span>{loading ? loadingText : children}</span>
    </button>
  );
}

export const linkClass =
  'rounded font-medium text-violet-600 transition hover:text-violet-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-200';
