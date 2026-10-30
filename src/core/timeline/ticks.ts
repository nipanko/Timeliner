import { addUnit, APPROX_MS, floorUnit, MINUTE, type Interval, type WeekStart } from '../time/units';
import type { Scale } from './scales';

const LABEL_STRIDES = [1, 2, 3, 4, 6, 12, 24];

/** Label every n-th major tick so labels `labelPx` long don't overlap. Short axes (horizontal on a phone) need this. */
export function labelEvery(every: Interval, span: number, axisPx: number, labelPx: number): number {
  const gapPx = (APPROX_MS[every.unit] * every.step * axisPx) / span;
  return LABEL_STRIDES.find((n) => n * gapPx >= labelPx) ?? LABEL_STRIDES[LABEL_STRIDES.length - 1];
}

/** Whether tick `t` is one of the labelled ones. Based on the local time itself, so labels don't jump while scrolling. */
export function hasLabel(t: number, every: Interval, n: number): boolean {
  const d = new Date(t);
  const index =
    every.unit === 'month' ? (d.getFullYear() * 12 + d.getMonth()) / every.step
    : every.unit === 'year' ? d.getFullYear() / every.step
    : Math.round((t - d.getTimezoneOffset() * MINUTE) / (APPROX_MS[every.unit] * every.step));
  return ((index % n) + n) % n === 0;
}

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
