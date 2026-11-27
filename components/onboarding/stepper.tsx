import Icon from '@/components/ui/icons';

const STEPS = ['Account', 'Details', 'Route', 'Payment', 'Review'];

/** 5-step onboarding progress. `current` is 1-based. */
export default function Stepper({ current }: { current: number }) {
  const progress = ((current - 1) / (STEPS.length - 1)) * 100;

  return (
    <nav aria-label="Onboarding progress" className="mb-7">
      <p className="mb-3 text-center text-xs text-zinc-400 sm:hidden">
        Step {current} of {STEPS.length}:{' '}
        <span className="font-semibold text-white">{STEPS[current - 1]}</span>
      </p>
      <div className="relative">
        <div aria-hidden="true" className="absolute left-4 right-4 top-4 h-0.5 rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-yellow-500 transition-[width] duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ol className="relative flex justify-between">
          {STEPS.map((label, index) => {
            const step = index + 1;
            const done = step < current;
            const active = step === current;
            return (
              <li
                key={label}
                className="flex flex-col items-center gap-2"
                aria-current={active ? 'step' : undefined}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition ${
                    done
                      ? 'border-yellow-400 bg-yellow-400 text-[#15110a]'
                      : active
                        ? 'border-yellow-300 bg-[#0d1219] text-yellow-200 shadow-[0_0_0_5px_rgba(232,187,64,0.15)]'
                        : 'border-zinc-700 bg-[#0d1219] text-zinc-500'
                  }`}
                >
                  {done ? <Icon name="check" size={15} /> : step}
                  <span className="sr-only">{done ? ' (done)' : ''}</span>
                </span>
                <span
                  className={`hidden text-[11px] sm:block ${active ? 'font-semibold text-white' : done ? 'text-yellow-200/80' : 'text-zinc-500'}`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
