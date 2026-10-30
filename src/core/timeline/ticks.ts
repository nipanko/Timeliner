import { addUnit, floorUnit, type Interval, type WeekStart } from '../time/units';
import type { Scale } from './scales';

/** Tick times in [start, end], aligned to the local calendar (6-hour ticks stay at 0/6/12/18 across DST). */
export function ticks(start: number, end: number, every: Interval, weekStart: WeekStart = 1, max = 400): number[] {
  const { unit, step } = every;
  const out: number[] = [];
  let t = floorUnit(start, unit, step, weekStart);
  if (t < start) t = next(t, every, weekStart);
  while (t <= end && out.length < max) {
    out.push(t);
    t = next(t, every, weekStart);
  }
  return out;
}

// Re-floor after each step so a DST change can't shift later ticks off the grid.
function next(t: number, { unit, step }: Interval, weekStart: WeekStart): number {
  for (let k = 1; ; k++) {
    const n = floorUnit(addUnit(t, unit, step * k), unit, step, weekStart);
    if (n > t) return n;
  }
}

/** Text for a labelled tick at this zoom, in the user's locale. January also shows the year at month zoom. */
export function tickLabel(t: number, scale: Scale, locale?: string): string {
  const options = scale.id === 'month' && new Date(t).getMonth() === 0 ? { month: 'short', year: 'numeric' } as const : scale.label;
  return new Intl.DateTimeFormat(locale, options).format(t);
}
