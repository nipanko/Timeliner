import { addUnit, floorUnit, type WeekStart } from './units';

export type Period = 'day' | 'week' | 'month' | 'year';

/** The day, week, month or year that contains `t`, as [start, end). */
export function periodRange(t: number, period: Period, weekStart: WeekStart = 1) {
  const start = floorUnit(t, period, 1, weekStart);
  return { start, end: addUnit(start, period, 1) };
}

/** How much of that period has passed, 0..1. Uses real elapsed time, so a 23-hour DST day is handled. */
export function periodProgress(t: number, period: Period, weekStart: WeekStart = 1): number {
  const { start, end } = periodRange(t, period, weekStart);
  return (t - start) / (end - start);
}

/** The 6 × 7 days a month calendar shows for the month containing `t`: starts on the week start before the 1st. */
export function monthGrid(t: number, weekStart: WeekStart = 1): number[] {
  const first = floorUnit(floorUnit(t, 'month'), 'week', 1, weekStart);
  return Array.from({ length: 42 }, (_, i) => addUnit(first, 'day', i));
}
