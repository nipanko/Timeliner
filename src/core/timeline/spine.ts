import { addUnit, floorUnit, type Interval, type WeekStart } from '../time/units';
import type { ScaleId } from './scales';
import { hasLabel } from './ticks';

// The v2 timeline (DESIGN.md §3.1): one spine down the middle, cards on both sides, a fixed pointer.

/** The timeline only needs where and when an entry is; `end: null` is a moment (todo, note, reminder). */
export type TimelineEntry = { id: string; layerId: string; start: number; end: number | null };

/** Which side of the spine a card sits on: -1 = left (above when horizontal), 1 = right (below). */
export type Side = -1 | 1;

/**
 * Cards alternate sides within their local day, in start order (ties by id), the first one on the right.
 * Only the day's own entries count, so a card keeps its side while the timeline scrolls.
 */
export function spineSides(entries: readonly { id: string; start: number }[]): Map<string, Side> {
  const days = new Map<number, { id: string; start: number }[]>();
  for (const e of entries) {
    const day = floorUnit(e.start, 'day');
    const list = days.get(day);
    if (list) list.push(e);
    else days.set(day, [e]);
  }
  const sides = new Map<string, Side>();
  for (const list of days.values()) {
    list.sort((a, b) => a.start - b.start || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    list.forEach((e, i) => sides.set(e.id, i % 2 === 0 ? 1 : -1));
  }
  return sides;
}

/**
 * Fixed-size cards along the axis: each one is centred on its anchor (px) unless the card before it on the
 * same side is in the way; then it slides further along, so cards never overlap. Returns each leading edge (px).
 */
export function stackCards(items: readonly { id: string; at: number; side: Side }[], cardPx: number, gapPx: number): Map<string, number> {
  const sorted = [...items].sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const ends = new Map<Side, number>();
  const tops = new Map<string, number>();
  for (const it of sorted) {
    const top = Math.max(it.at - cardPx / 2, (ends.get(it.side) ?? -Infinity) + gapPx);
    ends.set(it.side, top + cardPx);
    tops.set(it.id, top);
  }
  return tops;
}

/** The slot boundary nearest to `t` ('round'), or the first one not before it ('ceil'), on the local calendar. */
export function snapTo(t: number, every: Interval, mode: 'round' | 'ceil', weekStart: WeekStart = 1): number {
  const lo = floorUnit(t, every.unit, every.step, weekStart);
  if (t === lo) return lo;
  const hi = floorUnit(addUnit(lo, every.unit, every.step), every.unit, every.step, weekStart);
  return mode === 'ceil' || hi - t < t - lo ? hi : lo;
}

/** Zoomed far out, entries gather into one bubble per day (week zoom), week (month zoom) or quarter (year zoom). */
export const BUCKETS: Partial<Record<ScaleId, Interval>> = {
  week: { unit: 'day', step: 1 },
  month: { unit: 'week', step: 1 },
  year: { unit: 'month', step: 3 },
};

/** The zoom a tap on a bubble opens, close enough to read the cards inside it. */
export const BUCKET_ZOOM: Partial<Record<ScaleId, ScaleId>> = { week: 'hour', month: 'day', year: 'week' };

export type Bucket = { start: number; end: number; count: number; first: number; layerId: string; side: Side };

/**
 * Entries starting in [from, to), grouped per bucket: how many, the earliest start, the most common layer.
 * Sides alternate bucket by bucket and are fixed to the calendar, so they don't flip while scrolling.
 */
export function bucketize(entries: readonly { start: number; layerId: string }[], every: Interval, from: number, to: number, weekStart: WeekStart = 1): Bucket[] {
  const groups = new Map<number, { first: number; layers: Map<string, number> }>();
  for (const e of entries) {
    if (e.start < from || e.start >= to) continue;
    const start = floorUnit(e.start, every.unit, every.step, weekStart);
    let g = groups.get(start);
    if (!g) groups.set(start, (g = { first: e.start, layers: new Map() }));
    g.first = Math.min(g.first, e.start);
    g.layers.set(e.layerId, (g.layers.get(e.layerId) ?? 0) + 1);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([start, g]) => {
      let layerId = '';
      let most = 0;
      let count = 0;
      for (const [id, n] of g.layers) {
        count += n;
        if (n > most) [layerId, most] = [id, n];
      }
      return { start, end: addUnit(start, every.unit, every.step), count, first: g.first, layerId, side: hasLabel(start, every, 2) ? 1 : -1 } satisfies Bucket;
    });
}
