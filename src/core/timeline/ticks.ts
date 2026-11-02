import { addUnit, APPROX_MS, floorUnit, MINUTE, type Interval, type WeekStart } from '../time/units';
import type { ScaleId } from './scales';

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

const pad = (n: number) => String(n).padStart(2, '0');
const part = (t: number, options: Intl.DateTimeFormatOptions, locale?: string) => new Intl.DateTimeFormat(locale, options).format(t);

/** The app's clock, set in Settings: "21:05" (24-hour) or "9:05 PM" (12-hour), optionally with seconds. */
export function clockTime(t: number, h24: boolean, seconds = false): string {
  const d = new Date(t);
  const rest = `${pad(d.getMinutes())}${seconds ? `:${pad(d.getSeconds())}` : ''}`;
  return h24 ? `${pad(d.getHours())}:${rest}` : `${d.getHours() % 12 || 12}:${rest} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

/**
 * A ruler label in two halves, one each side of the spine: hours | minutes when zoomed in (the "h | m" ruler;
 * "9 PM | 00" on a 12-hour clock), weekday | date, month | date, month | year further out.
 */
export function rulerLabel(t: number, scale: ScaleId, h24: boolean, locale?: string): [string, string] {
  const d = new Date(t);
  switch (scale) {
    case 'sec':
      // The 12-hour half drops AM/PM here to fit; the pointer and the NOW pill still show it.
      return [h24 ? clockTime(t, true) : `${d.getHours() % 12 || 12}:${pad(d.getMinutes())}`, pad(d.getSeconds())];
    case 'min':
    case 'hour':
      return [h24 ? pad(d.getHours()) : `${d.getHours() % 12 || 12} ${d.getHours() < 12 ? 'AM' : 'PM'}`, pad(d.getMinutes())];
    case 'day':
      return [part(t, { weekday: 'short' }, locale).toUpperCase(), String(d.getDate())];
    case 'week':
      return [part(t, { month: 'short' }, locale).toUpperCase(), String(d.getDate())];
    case 'month':
      return [part(t, { month: 'short' }, locale).toUpperCase(), String(d.getFullYear())];
    case 'year':
      return [String(d.getFullYear()), ''];
  }
}

/** What the pointer reads at each zoom: a time, a day ("Tue 3") or a month ("Mar 2027"). */
export function pointerLabel(t: number, scale: ScaleId, h24: boolean, locale?: string): string {
  if (scale === 'sec') return clockTime(t, h24, true);
  if (scale === 'week' || scale === 'month') return `${part(t, { weekday: 'short' }, locale)} ${new Date(t).getDate()}`;
  if (scale === 'year') return part(t, { month: 'short', year: 'numeric' }, locale);
  return clockTime(t, h24);
}
