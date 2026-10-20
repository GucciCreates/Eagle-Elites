'use client';

import { useState, type InputHTMLAttributes } from 'react';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

/**
 * Password field with an accessible show/hide toggle.
 * Accepts every normal <input> prop except `type`.
 */
export default function PasswordInput({
  className = '',
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  // Leave room on the right for the toggle button.
  const inputClassName = className
    .replace(/(^|\s)pr-\d+(?=\s|$)/g, ' ')
    // Literal class names so Tailwind generates them.
    .replace(/(^|\s)px-3(?=\s|$)/g, ' pl-3 ')
    .replace(/(^|\s)px-4(?=\s|$)/g, ' pl-4 ')
    .replace(/(^|\s)px-5(?=\s|$)/g, ' pl-5 ')
    .concat(' pr-12')
    .replace(/\s+/g, ' ')
    .trim();

  return (
    <div className="relative w-full">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={inputClassName}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        aria-controls={props.id}
        title={visible ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/40"
      >
        {visible ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
            <path d="M1 1l22 22" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
