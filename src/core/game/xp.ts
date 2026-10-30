import type { EntryKind } from '../entries/timing';
import { floorUnit, HOUR, MINUTE } from '../time/units';

// Rules and their research basis: ARCHITECTURE.md §5, RESEARCH.md.
// XP is derived from entries, never stored, so undoing a task removes its XP automatically.

/** `focusedMs`: total time from focus sessions on this entry, if any. */
export type ScoredEntry = { kind: EntryKind; start: number; end: number | null; done: boolean; createdAt: number; focusedMs?: number };

const DONE_XP: Record<EntryKind, number> = { task: 10, todo: 5, reminder: 2, note: 1 };
const PLAN_AHEAD_XP = 2;
const PLAN_AHEAD_MAX_PER_DAY = 10;
const CALIBRATION_XP = 5;
/** Earned once per day closed in Review (RESEARCH.md #6, #19). */
export const REVIEW_XP = 5;

/** XP for finishing one entry: tasks earn 10 + 1 per 5 planned minutes (max +20), +5 when focused time was within 20 % of plan. */
export function entryXp(e: ScoredEntry): number {
  if (!e.done) return 0;
  if (e.kind !== 'task' || e.end === null) return DONE_XP[e.kind];
  const planned = e.end - e.start;
  const calibrated = !!e.focusedMs && Math.abs(e.focusedMs - planned) <= planned * 0.2;
  return DONE_XP.task + Math.min(20, Math.floor(planned / (5 * MINUTE))) + (calibrated ? CALIBRATION_XP : 0);
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
