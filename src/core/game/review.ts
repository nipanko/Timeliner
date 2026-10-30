import { MINUTE } from '../time/units';
import { entryXp, type ScoredEntry } from './xp';

export type DayEntry = ScoredEntry & { id: string };
export type PathStep = { id: string; state: 'done' | 'missed' | 'open' };

/**
 * The day's run for the Review screen (DESIGN.md §3.4): tasks and todos planned in [dayStart, dayEnd).
 * `focused` holds focused ms per entry id. `overrun` compares focused time with plan, only for tasks that
 * were focused on (RESEARCH.md #2); null when there's nothing to compare.
 */
export function summarizeDay(entries: readonly DayEntry[], focused: ReadonlyMap<string, number>, dayStart: number, dayEnd: number, now: number) {
  const day = entries
    .filter((e) => (e.kind === 'task' || e.kind === 'todo') && e.start >= dayStart && e.start < dayEnd)
    .sort((a, b) => a.start - b.start);
  const path: PathStep[] = day.map((e) => ({ id: e.id, state: e.done ? 'done' : (e.end ?? e.start) <= now ? 'missed' : 'open' }));

  let planned = 0;
  let actual = 0;
  let best: { id: string; score: number } | null = null;
  for (const e of day) {
    const f = (focused.get(e.id) ?? 0) >= MINUTE ? focused.get(e.id)! : 0; // a few stray seconds aren't a focus block
    if (e.kind === 'task' && e.end !== null && f > 0) {
      planned += e.end - e.start;
      actual += f;
    }
    // Peak-end rule (RESEARCH.md #19): the review closes on the longest finished piece of work.
    const score = f || (e.end ?? e.start) - e.start;
    if (e.done && (!best || score > best.score)) best = { id: e.id, score };
  }

  return {
    path,
    done: path.filter((p) => p.state === 'done').length,
    total: day.length,
    missed: path.filter((p) => p.state === 'missed').map((p) => p.id),
    focusedMs: day.reduce((sum, e) => sum + (focused.get(e.id) ?? 0), 0),
    xp: day.reduce((sum, e) => sum + entryXp({ ...e, focusedMs: focused.get(e.id) }), 0),
    overrun: planned > 0 ? actual / planned - 1 : null,
    bestId: best?.id ?? null,
  };
}
