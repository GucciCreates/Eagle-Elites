export default function SectionLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 flex items-center gap-2 text-xs font-medium text-zinc-400"
    >
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-300/25 border-t-yellow-300"
      />
      Loading section…
    </div>
  );
}
