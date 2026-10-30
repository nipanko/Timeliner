// shortcut: hard-coded entries around "now" so the read-only timeline has something to show; slice 3 replaces this with SQLite.
import { addUnit, DAY, floorUnit, HOUR, MINUTE } from '@/core/time/units';
import type { TimelineEntry } from '@/core/timeline/layout';
import { LAYER_COLORS, type LayerColor } from '@/ui/theme';

export type Layer = { id: string; name: string; color: LayerColor };
export type EntryKind = 'task' | 'todo' | 'note' | 'reminder';
export type Entry = TimelineEntry & { kind: EntryKind; title: string; done: boolean };

export const SAMPLE_LAYERS: Layer[] = [
  { id: 'work', name: 'Work', color: LAYER_COLORS.yellow },
  { id: 'study', name: 'Study', color: LAYER_COLORS.lilac },
  { id: 'health', name: 'Health', color: LAYER_COLORS.green },
  { id: 'life', name: 'Life', color: LAYER_COLORS.salmon },
];

export function sampleEntries(now: number): Entry[] {
  const r = Math.round(now / (15 * MINUTE)) * 15 * MINUTE;
  const day0 = floorUnit(now, 'day');
  const week0 = floorUnit(now, 'week');
  const month0 = floorUnit(now, 'month');
  const month1 = addUnit(month0, 'month', 1);
  const year1 = addUnit(floorUnit(now, 'year'), 'year', 1);
  let n = 0;
  const e = (layerId: string, kind: EntryKind, title: string, start: number, end: number | null = null, done = false): Entry => ({ id: `s${n++}`, layerId, kind, title, start, end, done });
  return [
    e('work', 'task', 'Plan the day', r - 5 * HOUR, r - 4.75 * HOUR, true),
    e('study', 'task', 'TypeScript: generics', r - 3.5 * HOUR, r - 2.5 * HOUR, true),
    e('work', 'task', 'Code review', r - 2 * HOUR, r - 1.5 * HOUR),
    e('work', 'task', 'Timeline engine spike', r - 50 * MINUTE, r + 40 * MINUTE),
    e('study', 'note', 'Idea: radial clock view', r - 20 * MINUTE),
    e('health', 'reminder', 'Drink water', r + 25 * MINUTE),
    e('health', 'task', 'Walk outside', r + 75 * MINUTE, r + 95 * MINUTE),
    e('work', 'todo', 'Reply to tester feedback', r + 2 * HOUR),
    e('study', 'task', 'Expo Router docs', r + 2.5 * HOUR, r + 3.5 * HOUR),
    e('work', 'task', 'Write devlog', r + 4 * HOUR, r + 4.75 * HOUR),
    e('life', 'reminder', 'Call home', r + 5.5 * HOUR),
    e('health', 'task', 'Gym', day0 + DAY + 7 * HOUR, day0 + DAY + 8 * HOUR),
    e('life', 'todo', 'Pay electricity bill', day0 + DAY + 10 * HOUR),
    e('study', 'task', 'Deep study block', day0 + 2 * DAY + 9 * HOUR, day0 + 2 * DAY + 12 * HOUR),
    e('work', 'task', 'Sprint: design + architecture', week0, addUnit(week0, 'week', 1)),
    e('work', 'task', 'MVP: local timeline', month1, addUnit(month1, 'month', 1)),
    e('study', 'task', 'Finish TypeScript course', day0 - 10 * DAY, day0 + 20 * DAY),
    e('health', 'task', 'Walk 100 km this month', month0, month1),
    e('life', 'task', 'Launch on Play Store', year1, addUnit(year1, 'month', 3)),
  ];
}
