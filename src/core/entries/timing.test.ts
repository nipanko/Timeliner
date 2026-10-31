import { HOUR, MINUTE } from '../time/units';
import { entryTiming, nudge, reschedule } from './timing';

const local = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();
const at = local(2026, 10, 30, 16, 15);

describe('entryTiming', () => {
  it('gives tasks at a moment their length, other kinds no end', () => {
    expect(entryTiming('task', 'moment', at, 25)).toEqual({ start: at, end: at + 25 * MINUTE });
    expect(entryTiming('todo', 'moment', at, 25)).toEqual({ start: at, end: null });
  });

  it('covers the whole day, week, month or year', () => {
    expect(entryTiming('task', 'day', at, 25)).toEqual({ start: local(2026, 10, 30), end: local(2026, 10, 31) });
    expect(entryTiming('note', 'week', at, 25)).toEqual({ start: local(2026, 10, 26), end: local(2026, 11, 2) });
    expect(entryTiming('todo', 'month', at, 25)).toEqual({ start: local(2026, 10, 1), end: local(2026, 11, 1) });
    expect(entryTiming('task', 'year', at, 25)).toEqual({ start: local(2026, 1, 1), end: local(2027, 1, 1) });
  });

  it('keeps reminders at a moment', () => {
    expect(entryTiming('reminder', 'week', at, 25)).toEqual({ start: at, end: null });
  });
});

describe('nudge', () => {
  it('steps 15 minutes for moments and whole periods otherwise', () => {
    expect(nudge(at, 'moment', -2)).toBe(at - 0.5 * HOUR);
    expect(nudge(local(2026, 1, 31), 'month', 1)).toBe(local(2026, 2, 28));
  });
});

describe('reschedule', () => {
  const quarter = { unit: 'minute', step: 15 } as const;
  it('snaps to the nearest slot and keeps the length', () => {
    const start = local(2026, 10, 30, 10, 0);
    expect(reschedule(start, start + 25 * MINUTE, 37 * MINUTE, quarter)).toEqual({ start: local(2026, 10, 30, 10, 30), end: local(2026, 10, 30, 10, 55) });
    expect(reschedule(start, start + HOUR, -38 * MINUTE, quarter)).toEqual({ start: local(2026, 10, 30, 9, 15), end: local(2026, 10, 30, 10, 15) });
  });
  it('leaves a point entry without an end and a tiny drag in place', () => {
    const start = local(2026, 10, 30, 10, 0);
    expect(reschedule(start, null, 4 * MINUTE, quarter)).toEqual({ start, end: null });
  });
  it('snaps by day across the DST change', () => {
    const start = local(2026, 10, 31, 9, 0); // DST ends 1 Nov in New York
    expect(reschedule(start, null, 2 * 24 * HOUR, { unit: 'day', step: 1 }).start).toBe(local(2026, 11, 2, 0, 0));
  });
});
