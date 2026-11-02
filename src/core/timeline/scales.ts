import { APPROX_MS, DAY, MINUTE, SECOND, type Interval } from '../time/units';

export type ScaleId = 'sec' | 'min' | 'hour' | 'day' | 'week' | 'month' | 'year';

/** One rung of the zoom ladder (ARCHITECTURE.md §4.2). */
export type Scale = {
  id: ScaleId;
  /** Time visible along the main axis, in ms. */
  span: number;
  minor: Interval;
  /** Labelled ticks. */
  major: Interval;
  /** Where a tap on the timeline lands. */
  snap: Interval;
  /** Length of a new task created at this zoom. */
  taskLength: Interval;
};

export const SCALES: readonly Scale[] = [
  { id: 'sec', span: 40 * SECOND, minor: { unit: 'second', step: 1 }, major: { unit: 'second', step: 5 }, snap: { unit: 'second', step: 1 }, taskLength: { unit: 'minute', step: 1 } },
  { id: 'min', span: 30 * MINUTE, minor: { unit: 'minute', step: 1 }, major: { unit: 'minute', step: 5 }, snap: { unit: 'minute', step: 1 }, taskLength: { unit: 'minute', step: 25 } },
  { id: 'hour', span: 9 * 60 * MINUTE, minor: { unit: 'minute', step: 15 }, major: { unit: 'hour', step: 1 }, snap: { unit: 'minute', step: 5 }, taskLength: { unit: 'minute', step: 25 } },
  { id: 'day', span: 4 * DAY, minor: { unit: 'hour', step: 6 }, major: { unit: 'day', step: 1 }, snap: { unit: 'hour', step: 1 }, taskLength: { unit: 'hour', step: 1 } },
  { id: 'week', span: 42 * DAY, minor: { unit: 'day', step: 1 }, major: { unit: 'week', step: 1 }, snap: { unit: 'day', step: 1 }, taskLength: { unit: 'day', step: 1 } },
  { id: 'month', span: 240 * DAY, minor: { unit: 'week', step: 1 }, major: { unit: 'month', step: 1 }, snap: { unit: 'day', step: 1 }, taskLength: { unit: 'week', step: 1 } },
  { id: 'year', span: 6 * 365 * DAY, minor: { unit: 'month', step: 1 }, major: { unit: 'year', step: 1 }, snap: { unit: 'month', step: 1 }, taskLength: { unit: 'month', step: 1 } },
];

export function getScale(id: ScaleId): Scale {
  return SCALES.find((s) => s.id === id)!;
}

/**
 * The finest rung whose labelled ticks stay at least `minGapPx` apart — picks the tick ladder
 * while the user pinches to any span in between.
 */
export function scaleForSpan(span: number, axisPx: number, minGapPx = 48): Scale {
  const msPerPx = span / axisPx;
  const fits = (s: Scale) => (APPROX_MS[s.major.unit] * s.major.step) / msPerPx >= minGapPx;
  return SCALES.find(fits) ?? SCALES[SCALES.length - 1];
}

/**
 * Pinch → zoom ladder: spreading fingers (scale > 1) zooms in to a finer rung, pinching zooms out.
 * Every doubling or halving of finger distance is one rung; a small wobble stays put.
 */
export function zoomAfterPinch(id: ScaleId, pinchScale: number): ScaleId {
  'worklet'; // also runs on the UI thread while the fingers move
  if (!(pinchScale > 0)) return id;
  const steps = Math.trunc(Math.log2(pinchScale) * 1.25); // ×1.75 → 1 rung, ×3 → 2 rungs
  const i = SCALES.findIndex((s) => s.id === id);
  return SCALES[Math.min(SCALES.length - 1, Math.max(0, i - steps))].id;
}
