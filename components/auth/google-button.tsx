'use client';

export default function GoogleButton({
  onClick,
  loading = false,
  label = 'Continue with Google',
}: {
  onClick: () => void;
  loading?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-70"
    >
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-zinc-900"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M21.8 12.23c0-.73-.07-1.43-.2-2.1H12v3.98h5.39a4.62 4.62 0 0 1-2 3.03v2.5h3.24c1.9-1.75 2.99-4.32 2.99-7.41Z"
            fill="#4285F4"
          />
          <path
            d="M12 22c2.7 0 4.96-.9 6.61-2.42l-3.24-2.5c-.9.61-2.06.97-3.37.97-2.59 0-4.79-1.75-5.57-4.1H.57v2.57A10 10 0 0 0 12 22Z"
            fill="#34A853"
          />
          <path
            d="M6.43 19.97A6 6 0 0 1 6 17.5V15H2.73A10 10 0 0 0 2 12c0-1.62.39-3.16 1.08-4.5L6.43 10.5A6 6 0 0 1 6 12c0 .67.1 1.33.3 1.95l.13.02Z"
            fill="#FBBC05"
          />
          <path
            d="M12 4.98c1.15 0 2.18.4 3 1.18l2.2-2.2A9.98 9.98 0 0 0 2 7.5L6.43 10.5A6 6 0 0 1 12 4.98Z"
            fill="#EA4335"
          />
        </svg>
      </span>
      <span>{loading ? 'Redirecting…' : label}</span>
    </button>
  );
}
