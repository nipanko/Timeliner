/** A run of focus on a task. Time is derived from these timestamps, so a locked phone or killed app never breaks it. */
export type FocusSession = { startedAt: number; endedAt: number | null; pausedMs: number; pausedAt: number | null };

/** Time actually focused, excluding pauses (including a pause still running). */
export function focusedMs(s: FocusSession, now: number): number {
  const end = s.endedAt ?? now;
  return end - s.startedAt - s.pausedMs - (s.pausedAt !== null ? end - s.pausedAt : 0);
}
