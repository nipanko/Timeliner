import { DAY, HOUR, MINUTE } from '../time/units';
import { entryXp, levelFor, totalXp, type ScoredEntry } from './xp';
import { streak } from './streaks';

const local = (y: number, mo: number, d: number, h = 0) => new Date(y, mo - 1, d, h).getTime();
const now = local(2026, 10, 30, 16);
const task = (min: number, done = true, createdAt = now): ScoredEntry => ({ kind: 'task', start: now, end: now + min * MINUTE, done, createdAt });

describe('xp', () => {
  it('scores finished entries by kind and length', () => {
    expect(entryXp(task(25))).toBe(15);
    expect(entryXp(task(600))).toBe(30);
    expect(entryXp(task(25, false))).toBe(0);
    expect(entryXp({ kind: 'todo', start: now, end: null, done: true, createdAt: now })).toBe(5);
  });

  it('adds planning-ahead XP, capped per day', () => {
    const early = now - 2 * HOUR;
    expect(totalXp([task(25, false, early)])).toBe(2);
    expect(totalXp(Array.from({ length: 8 }, () => task(25, false, early)))).toBe(10);
  });

  it('levels up on a growing curve', () => {
    expect(levelFor(0)).toEqual({ level: 1, into: 0, need: 100 });
    expect(levelFor(100)).toEqual({ level: 2, into: 0, need: 125 });
    expect(levelFor(330)).toEqual({ level: 3, into: 105, need: 150 });
  });
});

describe('streak', () => {
  const day = (n: number) => local(2026, 10, 30 - n, 10);

  it('counts days in a row and ignores an unfinished today', () => {
    expect(streak([day(1), day(2), day(3)], now)).toEqual({ days: 3, freezes: 0 });
    expect(streak([day(0), day(1)], now).days).toBe(2);
    expect(streak([], now).days).toBe(0);
  });

  it('resets after a missed day without a freeze', () => {
    expect(streak([day(1), day(3), day(4)], now).days).toBe(1);
  });

  it('uses a freeze earned after 7 days instead of resetting', () => {
    const week = [9, 8, 7, 6, 5, 4, 3].map(day); // 7 days in a row, then day 2 missed
    expect(streak([...week, day(1)], now)).toEqual({ days: 8, freezes: 0 });
    expect(streak(week, now - 2 * DAY + HOUR).freezes).toBe(1);
  });
});
