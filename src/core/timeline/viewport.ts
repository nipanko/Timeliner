import { DAY, SECOND } from '../time/units';

export type Direction = 'down' | 'up' | 'right' | 'left';

/** What the timeline camera shows (ARCHITECTURE.md §4.1). */
export type Viewport = {
  /** The time shown at `anchorFrac`; equals "now" while following the clock. */
  anchorTime: number;
  /** Where the anchor sits along the axis, 0..1 measured from the past end. */
  anchorFrac: number;
  /** Time visible along the main axis, in ms. */
  span: number;
  direction: Direction;
};

export const MIN_SPAN = 10 * SECOND;
export const MAX_SPAN = 30 * 365 * DAY;

export const isVertical = (d: Direction) => d === 'down' || d === 'up';
const isReversed = (d: Direction) => d === 'up' || d === 'left';

/** Screen position of `t` along the axis: 0 = top/left edge, 1 = bottom/right edge. May fall outside 0..1. */
export function timeToPos(t: number, v: Viewport): number {
  const p = v.anchorFrac + (t - v.anchorTime) / v.span;
  return isReversed(v.direction) ? 1 - p : p;
}

export function posToTime(pos: number, v: Viewport): number {
  const p = isReversed(v.direction) ? 1 - pos : pos;
  return v.anchorTime + (p - v.anchorFrac) * v.span;
}

export function visibleRange(v: Viewport) {
  const start = v.anchorTime - v.anchorFrac * v.span;
  return { start, end: start + v.span };
}

/** Drag: the content follows the finger. `deltaPos` is the finger's move as a fraction of the axis. */
export function panBy(v: Viewport, deltaPos: number): Viewport {
  const sign = isReversed(v.direction) ? 1 : -1;
  return { ...v, anchorTime: v.anchorTime + sign * deltaPos * v.span };
}

/** Pinch: multiply the span by `factor` (> 1 zooms out) while the time under `focusPos` stays put. */
export function zoomAround(v: Viewport, factor: number, focusPos: number): Viewport {
  const focusTime = posToTime(focusPos, v);
  const span = Math.min(MAX_SPAN, Math.max(MIN_SPAN, v.span * factor));
  const p = isReversed(v.direction) ? 1 - focusPos : focusPos;
  return { ...v, span, anchorTime: focusTime - (p - v.anchorFrac) * span };
}
