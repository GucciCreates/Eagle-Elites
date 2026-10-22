export default function Loading() {
  return (
    <main
      aria-label="Loading page"
      aria-live="polite"
      className="flex min-h-[60vh] flex-1 items-center justify-center bg-[#070b10] px-5 text-white"
    >
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0d131c] p-6 shadow-2xl shadow-black/30">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/10 text-yellow-300">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-300/30 border-t-yellow-300" />
          </span>
          <div>
            <p className="font-semibold">Loading your page</p>
            <p className="mt-1 text-sm text-zinc-400">This should only take a moment.</p>
          </div>
        </div>
        <div className="mt-6 space-y-2" aria-hidden="true">
          <div className="h-2 animate-pulse rounded-full bg-white/10" />
          <div className="h-2 w-3/4 animate-pulse rounded-full bg-white/10" />
        </div>
      </div>
    </main>
  );
}
