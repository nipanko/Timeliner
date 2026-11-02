import type { Granularity } from '../entries/timing';
import { HOUR } from '../time/units';
import { streak } from './streaks';
import { isCalibrated, type ScoredEntry } from './xp';

export type BadgeEntry = ScoredEntry & { granularity: Granularity };
/** How hard a card is to get (STRATEGY.md §5): rarer cards need weeks of consistency, never money. */
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
/** Badges are shown as collectible cards (v2): `no` is the card's number in the deck. */
export type Badge = { id: string; no: number; name: string; desc: string; rarity: Rarity; progress: number; earned: boolean };

/** Numbers the badges are measured on, all derived from entries (no stored unlocks yet). */
export function badgeStats(entries: readonly BadgeEntry[], now: number) {
  const run = streak(entries.filter((e) => e.done && (e.kind === 'task' || e.kind === 'todo')).map((e) => e.start), now);
  const tasks = entries.filter((e) => e.done && e.kind === 'task');
  const created = (e: BadgeEntry) => new Date(e.createdAt);
  return {
    done: entries.filter((e) => e.done && (e.kind === 'task' || e.kind === 'todo')).length,
    lateTasks: tasks.filter((e) => new Date(e.start).getHours() >= 21).length,
    bestStreak: run.best,
    comebacks: run.comebacks,
    focusedHours: entries.reduce((sum, e) => sum + (e.focusedMs ?? 0), 0) / HOUR,
    calibrated: tasks.filter(isCalibrated).length,
    earlyTasks: tasks.filter((e) => new Date(e.start).getHours() < 9).length,
    // Fresh-start effect (RESEARCH.md #12): goals set on a Monday or the 1st.
    freshStarts: entries.filter((e) => (e.granularity === 'month' || e.granularity === 'year') && (created(e).getDay() === 1 || created(e).getDate() === 1)).length,
  };
}

type Stats = ReturnType<typeof badgeStats> & { level: number };
// The deck, in card-number order. Ids are kept from the badge days so earned cards stay earned.
const DEFS: [id: string, name: string, desc: string, rarity: Rarity, value: (s: Stats) => number, target: number][] = [
  ['first', 'First step', 'Finish your first task', 'common', (s) => s.done, 1],
  ['early', 'Early bird', '5 tasks done before 9 AM', 'common', (s) => s.earlyTasks, 5],
  ['night', 'Night owl', '5 tasks done after 9 PM', 'common', (s) => s.lateTasks, 5],
  ['streak-3', 'Warm-up', '3-day streak', 'common', (s) => s.bestStreak, 3],
  ['fresh', 'Fresh start', 'Set a goal on a Monday or the 1st', 'common', (s) => s.freshStarts, 1],
  ['done-10', 'Ten down', '10 tasks done', 'common', (s) => s.done, 10],
  ['comeback', 'Comeback', 'Came back after a missed day', 'rare', (s) => s.comebacks, 1],
  ['streak-7', 'One week', '7-day streak', 'rare', (s) => s.bestStreak, 7],
  ['focus-10', 'Deep diver', '10 h focused', 'rare', (s) => s.focusedHours, 10],
  ['honest', 'Honest planner', '10 tasks within 20% of plan', 'rare', (s) => s.calibrated, 10],
  ['level-5', 'Level 5', 'Reach level 5', 'rare', (s) => s.level, 5],
  ['streak-14', 'Fortnight', '14-day streak', 'epic', (s) => s.bestStreak, 14],
  ['done-100', 'Century', '100 tasks done', 'epic', (s) => s.done, 100],
  ['focus-50', 'Flow state', '50 h focused', 'epic', (s) => s.focusedHours, 50],
  ['level-10', 'Level 10', 'Reach level 10', 'epic', (s) => s.level, 10],
  ['streak-30', 'Monthly', '30-day streak', 'legendary', (s) => s.bestStreak, 30],
  ['streak-66', 'Habit formed', '66 days, like real habits', 'legendary', (s) => s.bestStreak, 66],
];

/** Every card in the deck with its progress; `level` comes from total XP (xp.ts). */
export function badges(stats: ReturnType<typeof badgeStats>, level: number): Badge[] {
  return DEFS.map(([id, name, desc, rarity, value, target], i) => {
    const progress = Math.min(1, value({ ...stats, level }) / target);
    return { id, no: i + 1, name, desc, rarity, progress, earned: progress >= 1 };
  });
}
