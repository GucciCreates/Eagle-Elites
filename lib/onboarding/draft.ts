'use client';

import { useEffect, useRef } from 'react';

const PREFIX = 'ee:onboarding:';

export function loadDraft<T>(key: string): Partial<T> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as Partial<T>) : null;
  } catch {
    return null;
  }
}

export function clearDraft(key: string) {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* storage unavailable */
  }
}

/** Debounced save of form state to localStorage (save-and-resume). */
export function useSaveDraft(
  key: string | null,
  value: unknown,
  enabled = true,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serialized = JSON.stringify(value);
  useEffect(() => {
    if (!key || !enabled) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(PREFIX + key, serialized);
      } catch {
        /* quota or private mode */
      }
    }, 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [key, serialized, enabled]);
}
