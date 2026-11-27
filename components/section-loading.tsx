/** Slim progress indicator shown while a dashboard tab is switching. */
export default function SectionLoading() {
  return (
    <div role="status" aria-live="polite" className="relative mb-4 h-0.5 overflow-hidden rounded-full bg-white/[0.06]">
      <span className="sr-only">Loading section…</span>
      <span aria-hidden="true" className="ee-skeleton absolute inset-0 rounded-full !bg-[linear-gradient(90deg,transparent,rgba(232,187,64,0.9),transparent)]" />
    </div>
  );
}
