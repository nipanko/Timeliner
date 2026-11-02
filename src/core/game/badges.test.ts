import { HOUR, MINUTE } from '../time/units';
import { badges, badgeStats, type BadgeEntry } from './badges';

const at = (d: number, h: number) => new Date(2026, 9, d, h).getTime();
const task = (d: number, h: number, extra: Partial<BadgeEntry> = {}): BadgeEntry => ({
  kind: 'task', start: at(d, h), end: at(d, h) + 60 * MINUTE, done: true, createdAt: at(d, 0), granularity: 'moment', ...extra,
});

describe('badges', () => {
  const entries = [
    task(26, 8, { focusedMs: 60 * MINUTE }),
    task(27, 10),
    task(28, 10),
    task(30, 10),
    task(1, 0, { granularity: 'month', done: false, createdAt: at(26, 12), end: at(31, 0) }), // set on a Monday
  ];
  const stats = badgeStats(entries, at(30, 20));

  it('measures streaks, comebacks, focus and planning', () => {
    expect(stats).toEqual({ done: 4, lateTasks: 0, bestStreak: 3, comebacks: 1, focusedHours: 1, calibrated: 1, earlyTasks: 1, freshStarts: 1 });
  });

  it('earns badges and shows progress toward the rest', () => {
    const list = Object.fromEntries(badges(stats, 2).map((b) => [b.id, b]));
    expect(list['streak-3'].earned).toBe(true);
    expect(list['streak-7'].progress).toBeCloseTo(3 / 7);
    expect(list.comeback.earned).toBe(true);
    expect(list['focus-10'].progress).toBeCloseTo(0.1);
    expect(list.first.earned).toBe(true);
    expect(list['level-5'].progress).toBeCloseTo(0.4);
    expect(badges(badgeStats([], at(30, 20)), 0).every((b) => !b.earned && b.progress === 0)).toBe(true);
  });

  it('numbers the deck in order and ranks rarer cards later', () => {
    const deck = badges(stats, 1);
    expect(deck.map((b) => b.no)).toEqual(deck.map((_, i) => i + 1));
    const rank = { common: 0, rare: 1, epic: 2, legendary: 3 };
    expect(deck.every((b, i) => i === 0 || rank[deck[i - 1].rarity] <= rank[b.rarity])).toBe(true);
  });

  it('counts late tasks for the night owl', () => {
    expect(badgeStats([task(30, 22), task(30, 20)], at(31, 1)).lateTasks).toBe(1);
  });

  it('ignores focus hours from unfinished work in calibration', () => {
    expect(badgeStats([task(30, 10, { done: false, focusedMs: HOUR })], at(30, 20)).calibrated).toBe(0);
  });
});
