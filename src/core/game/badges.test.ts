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
    expect(stats).toEqual({ bestStreak: 3, comebacks: 1, focusedHours: 1, calibrated: 1, earlyTasks: 1, freshStarts: 1 });
  });

  it('earns badges and shows progress toward the rest', () => {
    const list = Object.fromEntries(badges(stats).map((b) => [b.id, b]));
    expect(list['streak-3'].earned).toBe(true);
    expect(list['streak-7'].progress).toBeCloseTo(3 / 7);
    expect(list.comeback.earned).toBe(true);
    expect(list['focus-10'].progress).toBeCloseTo(0.1);
    expect(badges(badgeStats([], at(30, 20))).every((b) => !b.earned && b.progress === 0)).toBe(true);
  });

  it('ignores focus hours from unfinished work in calibration', () => {
    expect(badgeStats([task(30, 10, { done: false, focusedMs: HOUR })], at(30, 20)).calibrated).toBe(0);
  });
});
