import { DAY, HOUR, MINUTE } from '../time/units';
import { summarizeDay, type DayEntry } from './review';

const day0 = new Date(2026, 9, 30).getTime();
const now = day0 + 15 * HOUR;
const task = (id: string, h: number, min: number, done: boolean): DayEntry => ({ id, kind: 'task', start: day0 + h * HOUR, end: day0 + h * HOUR + min * MINUTE, done, createdAt: day0 });

describe('summarizeDay', () => {
  const entries = [
    task('late', 18, 30, false),
    task('a', 9, 60, true),
    task('b', 11, 30, false),
    task('c', 13, 90, true),
    task('tomorrow', 33, 30, false),
    { id: 'note', kind: 'note', start: day0 + 10 * HOUR, end: null, done: true, createdAt: day0 } as DayEntry,
  ];
  const focused = new Map([['a', 72 * MINUTE], ['c', 90 * MINUTE]]);
  const s = summarizeDay(entries, focused, day0, day0 + DAY, now);

  it('walks the day in time order: done, missed, still open', () => {
    expect(s.path).toEqual([
      { id: 'a', state: 'done' },
      { id: 'b', state: 'missed' },
      { id: 'c', state: 'done' },
      { id: 'late', state: 'open' },
    ]);
    expect([s.done, s.total, s.missed]).toEqual([2, 4, ['b']]);
  });

  it('adds up focus, XP and plan vs actual', () => {
    expect(s.focusedMs).toBe(162 * MINUTE);
    expect(s.xp).toBe(22 + 5 + 28 + 5); // a and c, both within 20 % of plan
    expect(s.overrun).toBeCloseTo(162 / 150 - 1);
  });

  it('ends on the longest finished work', () => {
    expect(s.bestId).toBe('c');
  });

  it('has nothing to compare without focus, or with only stray seconds', () => {
    expect(summarizeDay(entries, new Map(), day0, day0 + DAY, now).overrun).toBeNull();
    expect(summarizeDay(entries, new Map([['a', 5000]]), day0, day0 + DAY, now).overrun).toBeNull();
  });
});
