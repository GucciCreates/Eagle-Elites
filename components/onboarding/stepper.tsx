const STEPS = ['Account', 'Details', 'Route', 'Payment', 'Review'];

/** 5-step onboarding progress. `current` is 1-based. */
export default function Stepper({ current }: { current: number }) {
  return (
    <nav aria-label="Onboarding progress" className="mb-6">
      <p className="mb-2 text-center text-xs text-zinc-400 sm:hidden">
        Step {current} of {STEPS.length}:{' '}
        <span className="text-white">{STEPS[current - 1]}</span>
      </p>
      <ol className="flex items-center gap-1.5 sm:gap-2">
        {STEPS.map((label, index) => {
          const step = index + 1;
          const done = step < current;
          const active = step === current;
          return (
            <li
              key={label}
              className="flex flex-1 flex-col items-center gap-1.5"
              aria-current={active ? 'step' : undefined}
            >
              <span
                className={`h-1.5 w-full rounded-full ${done ? 'bg-yellow-400' : active ? 'bg-yellow-400/60' : 'bg-zinc-800'}`}
              />
              <span
                className={`hidden text-[11px] sm:block ${active ? 'font-semibold text-white' : done ? 'text-yellow-300/80' : 'text-zinc-500'}`}
              >
                {done ? '✓ ' : ''}
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
