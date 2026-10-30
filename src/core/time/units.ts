// Calendar math in the device's local time zone. Pure: the time to work on is always passed in.

export type Unit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

/** "Every `step` `unit`s", e.g. every 15 minutes. */
export type Interval = { unit: Unit; step: number };

/** 0 = weeks start on Sunday, 1 = on Monday. */
export type WeekStart = 0 | 1;

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;

/** Typical length of each unit. Only for sizing decisions: real months, years and DST days vary. */
export const APPROX_MS: Record<Unit, number> = {
  second: SECOND,
  minute: MINUTE,
  hour: HOUR,
  day: DAY,
  week: WEEK,
  month: 30.44 * DAY,
  year: 365.25 * DAY,
};

const CLOCK_MS: Partial<Record<Unit, number>> = { second: SECOND, minute: MINUTE, hour: HOUR };

const mod = (a: number, b: number) => ((a % b) + b) % b;
const daysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

/**
 * Start of the slot of `step` `unit`s that contains `t` (the 15-minute slot, the week, the quarter…).
 * `step` is ignored for days and weeks.
 */
export function floorUnit(t: number, unit: Unit, step = 1, weekStart: WeekStart = 1): number {
  const clock = CLOCK_MS[unit];
  if (clock) {
    // Floor on the local wall clock with the offset in force at `t`, so half-hour zones (IST)
    // and the repeated hour when DST ends both land on the right slot.
    const offset = new Date(t).getTimezoneOffset() * MINUTE;
    const wall = t - offset; // wall-clock time written as if it were UTC
    const floored = wall - mod(wall, clock * step);
    const guess = floored + offset;
    if (new Date(guess).getTimezoneOffset() * MINUTE === offset) return guess;
    // A DST change falls inside this slot: rebuild the slot start from its wall-clock fields.
    const w = new Date(floored);
    return new Date(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate(), w.getUTCHours(), w.getUTCMinutes(), w.getUTCSeconds()).getTime();
  }
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  if (unit === 'week') d.setDate(d.getDate() - mod(d.getDay() - weekStart, 7));
  if (unit === 'month' || unit === 'year') d.setDate(1);
  if (unit === 'month') d.setMonth(d.getMonth() - mod(d.getMonth(), step));
  if (unit === 'year') d.setFullYear(d.getFullYear() - mod(d.getFullYear(), step), 0, 1);
  return d.getTime();
}

/**
 * `t` moved by `n` units. Seconds, minutes and hours add real elapsed time; days and longer
 * keep the wall-clock time. Months and years clamp the day (Jan 31 + 1 month = Feb 28).
 */
export function addUnit(t: number, unit: Unit, n: number): number {
  const clock = CLOCK_MS[unit];
  if (clock) return t + n * clock;
  const d = new Date(t);
  if (unit === 'day' || unit === 'week') {
    d.setDate(d.getDate() + n * (unit === 'week' ? 7 : 1));
    return d.getTime();
  }
  const day = d.getDate();
  d.setDate(1);
  if (unit === 'month') d.setMonth(d.getMonth() + n);
  else d.setFullYear(d.getFullYear() + n);
  d.setDate(Math.min(day, daysInMonth(d)));
  return d.getTime();
}
