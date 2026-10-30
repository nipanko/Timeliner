import { WEEK } from '../time/units';
import { timeToPos, visibleRange, type Viewport } from './viewport';

/** The timeline only needs where and when an entry is; `end: null` is a moment (todo, note, reminder). */
export type TimelineEntry = { id: string; layerId: string; start: number; end: number | null };

/**
 * How an entry is drawn (ARCHITECTURE.md §4.2): `band` is longer than the view (strip on the lane edge),
 * `card` a time block, `compact` a block too short for text, `pill` a moment, `dot` a moment when zoomed out.
 */
export type Shape = 'band' | 'card' | 'compact' | 'pill' | 'dot';

export type PlacedItem = {
  id: string;
  lane: number;
  shape: Shape;
  /** Leading edge in screen space (0 = top/left) and length, both as fractions of the axis. */
  pos: number;
  size: number;
  /** When items in a lane overlap they sit side by side: this is slot `column` of `columns`. */
  column: number;
  columns: number;
};

export const BAND_RATIO = 1.2;
export const COMPACT_BELOW_PX = 24;
export const CARD_MIN_PX = 30;
export const COMPACT_MIN_PX = 6;
export const PILL_PX = 30;
export const DOT_PX = 8;
export const DOTS_FROM_SPAN = WEEK;
const OFFSCREEN_MARGIN = 0.05;

export type LayoutOptions = {
  /** Also lay out this many screens before and after the view, so dragging never shows an empty edge. */
  buffer?: number;
  /** Length of a moment's pill along the axis (horizontal timelines use a wider pill). */
  pillPx?: number;
};

/** Positions every visible entry in visible `lanes` (layer ids, in display order) for an axis `axisPx` long. */
export function layoutTimeline(
  entries: readonly TimelineEntry[],
  lanes: readonly string[],
  v: Viewport,
  axisPx: number,
  { buffer = 0, pillPx = PILL_PX }: LayoutOptions = {},
): PlacedItem[] {
  const { start: viewStart, end: viewEnd } = visibleRange(v);
  const margin = Math.max(OFFSCREEN_MARGIN, buffer) * v.span;
  const frac = (px: number) => px / axisPx;
  const placed: PlacedItem[] = [];

  for (const e of entries) {
    const lane = lanes.indexOf(e.layerId);
    const end = e.end ?? e.start;
    if (lane < 0 || end < viewStart - margin || e.start > viewEnd + margin) continue;

    const a = timeToPos(e.start, v);
    const b = timeToPos(end, v);
    let lo = Math.min(a, b);
    let hi = Math.max(a, b);
    let shape: Shape;
    if (e.end === null) {
      shape = v.span >= DOTS_FROM_SPAN ? 'dot' : 'pill';
      const half = frac(shape === 'dot' ? DOT_PX : pillPx) / 2;
      lo -= half;
      hi += half;
    } else if (e.end - e.start > BAND_RATIO * v.span) {
      shape = 'band';
      lo = Math.max(lo, -buffer);
      hi = Math.min(hi, 1 + buffer);
    } else {
      shape = (hi - lo) * axisPx < COMPACT_BELOW_PX ? 'compact' : 'card';
      hi = Math.max(hi, lo + frac(shape === 'card' ? CARD_MIN_PX : COMPACT_MIN_PX));
    }
    placed.push({ id: e.id, lane, shape, pos: lo, size: hi - lo, column: 0, columns: 1 });
  }

  lanes.forEach((_, lane) => assignColumns(placed.filter((p) => p.lane === lane && p.shape !== 'band')));
  return placed;
}

// Calendar-style overlap layout: each run of overlapping items shares the lane in equal columns.
function assignColumns(items: PlacedItem[]) {
  items.sort((x, y) => x.pos - y.pos || y.size - x.size);
  let group: PlacedItem[] = [];
  let columnEnds: number[] = [];
  let groupEnd = -Infinity;
  const closeGroup = () => {
    for (const it of group) it.columns = columnEnds.length;
    group = [];
    columnEnds = [];
  };
  for (const it of items) {
    if (it.pos >= groupEnd) closeGroup();
    let col = columnEnds.findIndex((end) => end <= it.pos);
    if (col < 0) col = columnEnds.push(0) - 1;
    columnEnds[col] = it.pos + it.size;
    it.column = col;
    group.push(it);
    groupEnd = Math.max(groupEnd, it.pos + it.size);
  }
  closeGroup();
}
