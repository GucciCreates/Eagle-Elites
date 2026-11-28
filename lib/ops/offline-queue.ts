/**
 * Attendance taps made without signal are kept on the phone and sent when
 * the connection returns. Only the latest tap per student and date matters.
 */
export type QueuedMark = { student_id: string; date: string; status: 'present' | 'absent'; at: number };

export const QUEUE_KEY = 'ee-driver-attendance-queue';

/** Adds the time of the tap. */
export function stampMark(mark: Omit<QueuedMark, 'at'>): QueuedMark {
  return { ...mark, at: Date.now() };
}

export function enqueue(queue: QueuedMark[], mark: QueuedMark): QueuedMark[] {
  return [...queue.filter((m) => !(m.student_id === mark.student_id && m.date === mark.date)), mark];
}

export function parseQueue(raw: string | null): QueuedMark[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value)
      ? value.filter((m) => m && typeof m.student_id === 'string' && typeof m.date === 'string' && (m.status === 'present' || m.status === 'absent'))
      : [];
  } catch {
    return [];
  }
}

/** Sends each mark; returns the ones that still failed (kept for next time). */
export async function flushQueue(queue: QueuedMark[], send: (mark: QueuedMark) => Promise<boolean>) {
  const left: QueuedMark[] = [];
  for (const mark of queue) {
    let ok = false;
    try {
      ok = await send(mark);
    } catch {
      ok = false;
    }
    if (!ok) left.push(mark);
  }
  return left;
}
