import type { EntryKind } from '../entries/timing';
import { floorUnit, HOUR, MINUTE } from '../time/units';

// Rules and their research basis: ARCHITECTURE.md §5, RESEARCH.md.
// XP is derived from entries, never stored, so undoing a task removes its XP automatically.

export type ScoredEntry = { kind: EntryKind; start: number; end: number | null; done: boolean; createdAt: number };

const DONE_XP: Record<EntryKind, number> = { task: 10, todo: 5, reminder: 2, note: 1 };
const PLAN_AHEAD_XP = 2;
const PLAN_AHEAD_MAX_PER_DAY = 10;

/** XP for finishing one entry: tasks earn 10 + 1 per 5 planned minutes (max +20). */
export function entryXp(e: ScoredEntry): number {
  if (!e.done) return 0;
  if (e.kind !== 'task' || e.end === null) return DONE_XP[e.kind];
  return DONE_XP.task + Math.min(20, Math.floor((e.end - e.start) / (5 * MINUTE)));
}

/** All XP: finished entries, plus +2 for each entry planned ≥ 1 h ahead (at most 10 a day, so planning can't be farmed). */
export function totalXp(entries: readonly ScoredEntry[]): number {
  const planned = new Map<number, number>();
  let xp = 0;
  for (const e of entries) {
    xp += entryXp(e);
    if (e.start - e.createdAt >= HOUR) {
      const day = floorUnit(e.createdAt, 'day');
      planned.set(day, Math.min(PLAN_AHEAD_MAX_PER_DAY, (planned.get(day) ?? 0) + PLAN_AHEAD_XP));
    }
  }
  for (const v of planned.values()) xp += v;
  return xp;
}

/** Level from total XP: going from level n to n+1 costs 100 + 25·(n − 1). */
export function levelFor(xp: number) {
  let level = 1;
  let need = 100;
  let into = xp;
  while (into >= need) {
    into -= need;
    level += 1;
    need = 100 + 25 * (level - 1);
  }
  return { level, into, need };
}
