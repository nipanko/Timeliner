import { addUnit, floorUnit, MINUTE, type WeekStart } from '../time/units';
import type { ScaleId } from '../timeline/scales';

export type EntryKind = 'task' | 'todo' | 'note' | 'reminder';

/** How much time an entry covers: a moment (a task also gets a length), or a whole day, week, month or year. */
export type Granularity = 'moment' | 'day' | 'week' | 'month' | 'year';

/** What a tap adds at each zoom: at week zoom you plan days, at month zoom weeks, at year zoom months. */
export const DEFAULT_GRANULARITY: Record<ScaleId, Granularity> = {
  sec: 'moment',
  min: 'moment',
  hour: 'moment',
  day: 'moment',
  week: 'day',
  month: 'week',
  year: 'month',
};

/** Start and end of an entry. Reminders always fire at a moment; todos, notes and reminders at a moment have no end. */
export function entryTiming(kind: EntryKind, granularity: Granularity, at: number, lengthMin: number, weekStart: WeekStart = 1) {
  if (granularity === 'moment' || kind === 'reminder') {
    return { start: at, end: kind === 'task' ? at + lengthMin * MINUTE : null };
  }
  const start = floorUnit(at, granularity, 1, weekStart);
  return { start, end: addUnit(start, granularity, 1) };
}

/** Move a time `n` steps earlier/later: 15 minutes for moments, otherwise one whole period. */
export function nudge(at: number, granularity: Granularity, n: number): number {
  return granularity === 'moment' ? at + n * 15 * MINUTE : addUnit(at, granularity, n);
}
