import type { Granularity } from '../entries/timing';
import { HOUR } from '../time/units';
import { streak } from './streaks';
import { isCalibrated, type ScoredEntry } from './xp';

export type BadgeEntry = ScoredEntry & { granularity: Granularity };
export type Badge = { id: string; name: string; desc: string; progress: number; earned: boolean };

/** Numbers the badges are measured on, all derived from entries (no stored unlocks yet). */
export function badgeStats(entries: readonly BadgeEntry[], now: number) {
  const run = streak(entries.filter((e) => e.done && (e.kind === 'task' || e.kind === 'todo')).map((e) => e.start), now);
  const tasks = entries.filter((e) => e.done && e.kind === 'task');
  const created = (e: BadgeEntry) => new Date(e.createdAt);
  return {
    bestStreak: run.best,
    comebacks: run.comebacks,
    focusedHours: entries.reduce((sum, e) => sum + (e.focusedMs ?? 0), 0) / HOUR,
    calibrated: tasks.filter(isCalibrated).length,
    earlyTasks: tasks.filter((e) => new Date(e.start).getHours() < 9).length,
    // Fresh-start effect (RESEARCH.md #12): goals set on a Monday or the 1st.
    freshStarts: entries.filter((e) => (e.granularity === 'month' || e.granularity === 'year') && (created(e).getDay() === 1 || created(e).getDate() === 1)).length,
  };
}

type Stats = ReturnType<typeof badgeStats>;
const DEFS: [id: string, name: string, desc: string, value: (s: Stats) => number, target: number][] = [
  ['streak-3', 'Warm-up', '3-day streak', (s) => s.bestStreak, 3],
  ['streak-7', 'One week', '7-day streak', (s) => s.bestStreak, 7],
  ['streak-14', 'Fortnight', '14-day streak', (s) => s.bestStreak, 14],
  ['streak-30', 'Monthly', '30-day streak', (s) => s.bestStreak, 30],
  ['streak-66', 'Habit formed', '66 days, like real habits', (s) => s.bestStreak, 66],
  ['focus-10', 'Deep diver', '10 h focused', (s) => s.focusedHours, 10],
  ['focus-50', 'Flow state', '50 h focused', (s) => s.focusedHours, 50],
  ['honest', 'Honest planner', '10 tasks within 20% of plan', (s) => s.calibrated, 10],
  ['early', 'Early bird', '5 tasks done before 9 AM', (s) => s.earlyTasks, 5],
  ['comeback', 'Comeback', 'Came back after a missed day', (s) => s.comebacks, 1],
  ['fresh', 'Fresh start', 'Set a goal on a Monday or the 1st', (s) => s.freshStarts, 1],
];

export function badges(stats: Stats): Badge[] {
  return DEFS.map(([id, name, desc, value, target]) => {
    const progress = Math.min(1, value(stats) / target);
    return { id, name, desc, progress, earned: progress >= 1 };
  });
}
