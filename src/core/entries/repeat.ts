import { addUnit, floorUnit } from '../time/units';

/** How an entry repeats. Days are 0 = Sunday … 6 = Saturday. Stored on the entry as text: "daily" or "weekly:1,3,5". */
export type Repeat = { kind: 'daily' } | { kind: 'weekly'; days: number[] };

export function parseRepeat(text: string | null | undefined): Repeat | null {
  if (!text) return null;
  if (text === 'daily') return { kind: 'daily' };
  const m = /^weekly:([0-6](?:,[0-6])*)$/.exec(text);
  if (!m) return null;
  const days = [...new Set(m[1].split(',').map(Number))].sort();
  return days.length === 7 ? { kind: 'daily' } : { kind: 'weekly', days };
}

export function formatRepeat(r: Repeat | null): string | null {
  if (!r) return null;
  return r.kind === 'daily' ? 'daily' : `weekly:${[...r.days].sort().join(',')}`;
}

const WEEKDAYS = [1, 2, 3, 4, 5];
const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Daily", "Weekdays", "Weekends", or "Mon, Wed, Fri". */
export function repeatLabel(r: Repeat): string {
  if (r.kind === 'daily') return 'Daily';
  const d = r.days.join(',');
  if (d === WEEKDAYS.join(',')) return 'Weekdays';
  if (d === '0,6') return 'Weekends';
  // Monday first reads naturally in a week.
  return [...r.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((x) => SHORT[x]).join(', ');
}

const MAX = 2000; // occurrences per call: plenty for any visible window, cheap for the layout

/**
 * Starts of a series' occurrences that overlap [from, to): the same wall-clock time as the first one,
 * on matching days, never before the first one. Wall-clock time survives DST changes.
 */
export function occurrences(first: number, length: number, rule: Repeat, from: number, to: number): number[] {
  const t = new Date(first);
  const [h, m, s, ms] = [t.getHours(), t.getMinutes(), t.getSeconds(), t.getMilliseconds()];
  const out: number[] = [];
  let day = Math.max(floorUnit(first, 'day'), floorUnit(from - length, 'day'));
  while (day < to && out.length < MAX) {
    const d = new Date(day);
    if (rule.kind === 'daily' || rule.days.includes(d.getDay())) {
      d.setHours(h, m, s, ms);
      const at = d.getTime();
      if (at >= first && at < to && at + length > from) out.push(at);
    }
    day = addUnit(day, 'day', 1);
  }
  return out;
}

/** An occurrence's id: the series id plus its start. Also the key of its completion row. */
export const occurrenceId = (seriesId: string, start: number) => `${seriesId}@${start}`;

type Series = { id: string; start: number; end: number | null; done: boolean; repeat: string | null };

/**
 * Replaces each repeating entry with its occurrences in [from, to); other entries pass through unchanged.
 * An occurrence is done when `completed` holds its id.
 */
export function expandEntries<T extends Series>(entries: readonly T[], completed: ReadonlySet<string>, from: number, to: number): (T & { seriesId?: string })[] {
  const out: (T & { seriesId?: string })[] = [];
  for (const e of entries) {
    const rule = parseRepeat(e.repeat);
    if (!rule) {
      out.push(e);
      continue;
    }
    const length = e.end === null ? 0 : e.end - e.start;
    for (const at of occurrences(e.start, length, rule, from, to)) {
      const id = occurrenceId(e.id, at);
      out.push({ ...e, id, seriesId: e.id, start: at, end: e.end === null ? null : at + length, done: completed.has(id) });
    }
  }
  return out;
}
