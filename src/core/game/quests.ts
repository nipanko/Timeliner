import { addUnit, DAY, floorUnit, MINUTE } from '../time/units';
import { focusedMs, type FocusSession } from './focus';
import type { ScoredEntry } from './xp';

// Daily quests (STRATEGY.md §3): three small, varied goals a day; all three earn a bonus.
// Like XP, they are derived from saved data, never stored, so undoing work undoes the quest.

export const QUEST_BONUS_XP = 20;

/** What happened on one local day, as the quests measure it. */
export type DayFacts = { done: number; doneBeforeNoon: number; planned: number; plannedTomorrow: number; focusMin: number; closed: boolean };

export type QuestId = 'done-3' | 'focus-25' | 'plan-tomorrow' | 'before-noon' | 'close-day' | 'plan-3';

const POOL: { id: QuestId; title: string; target: number; value: (f: DayFacts) => number }[] = [
  { id: 'done-3', title: 'Finish 3 tasks', target: 3, value: (f) => f.done },
  { id: 'focus-25', title: 'Focus for 25 minutes', target: 25, value: (f) => f.focusMin },
  { id: 'plan-tomorrow', title: 'Plan something for tomorrow', target: 1, value: (f) => f.plannedTomorrow },
  { id: 'before-noon', title: 'Finish a task before noon', target: 1, value: (f) => f.doneBeforeNoon },
  { id: 'close-day', title: 'Close the day in Review', target: 1, value: (f) => (f.closed ? 1 : 0) },
  { id: 'plan-3', title: "Put 3 things on today's line", target: 3, value: (f) => f.planned },
];

export type Quest = { id: QuestId; title: string; value: number; target: number; progress: number; done: boolean };

/** The day's three quests: fixed for the whole day, shuffled from the date (Park–Miller), so they vary day to day. */
export function questsFor(day: number): QuestId[] {
  const index = Math.round((day - new Date(day).getTimezoneOffset() * MINUTE) / DAY);
  let seed = (((index % 2147483646) + 2147483646) % 2147483646) + 1;
  const ids = POOL.map((q) => q.id);
  for (let i = ids.length - 1; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, 3);
}

type QuestEntry = Pick<ScoredEntry, 'kind' | 'start' | 'done' | 'createdAt'>;

/** Measures local day `day` (its start): finished and planned work, plans made for tomorrow, focus, a closed review. */
export function dayFacts(day: number, entries: readonly QuestEntry[], sessions: readonly FocusSession[], closedDays: readonly number[], now: number): DayFacts {
  const next = addUnit(day, 'day', 1);
  const after = addUnit(day, 'day', 2);
  const work = entries.filter((e) => (e.kind === 'task' || e.kind === 'todo') && e.start >= day && e.start < next);
  const done = work.filter((e) => e.done);
  return {
    done: done.length,
    doneBeforeNoon: done.filter((e) => new Date(e.start).getHours() < 12).length,
    planned: work.length,
    plannedTomorrow: entries.filter((e) => e.kind !== 'note' && e.start >= next && e.start < after && e.createdAt >= day && e.createdAt < next).length,
    focusMin: Math.floor(sessions.filter((s) => s.startedAt >= day && s.startedAt < next).reduce((sum, s) => sum + focusedMs(s, now), 0) / MINUTE),
    closed: closedDays.includes(day),
  };
}

export function dayQuests(day: number, facts: DayFacts): Quest[] {
  return questsFor(day).map((id) => {
    const q = POOL.find((p) => p.id === id)!;
    const value = Math.min(q.target, q.value(facts));
    return { id, title: q.title, value, target: q.target, progress: value / q.target, done: value >= q.target };
  });
}

/**
 * Days (up to today) with all three quests done. Only days that have any data can qualify.
 * shortcut: re-measures every active day on each change (days × entries); keep per-day facts if it ever shows up in a profile.
 */
export function questDaysDone(entries: readonly QuestEntry[], sessions: readonly FocusSession[], closedDays: readonly number[], now: number): number {
  const today = floorUnit(now, 'day');
  const days = new Set<number>(closedDays);
  for (const e of entries) days.add(floorUnit(e.start, 'day')).add(floorUnit(e.createdAt, 'day'));
  for (const s of sessions) days.add(floorUnit(s.startedAt, 'day'));
  let count = 0;
  for (const day of days) if (day <= today && dayQuests(day, dayFacts(day, entries, sessions, closedDays, now)).every((q) => q.done)) count++;
  return count;
}
