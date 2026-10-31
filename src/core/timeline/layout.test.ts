import { DAY, HOUR, MINUTE, WEEK } from '../time/units';
import { laneAfterDrag, layoutTimeline, type TimelineEntry } from './layout';
import type { Viewport } from './viewport';

const now = Date.UTC(2026, 9, 30, 9, 0);
// 10 hours on a 500 px axis: 1 hour = 0.1 of the axis = 50 px.
const view: Viewport = { anchorTime: now, anchorFrac: 0.3, span: 10 * HOUR, direction: 'down' };
const AXIS = 500;
const task = (id: string, startMin: number, endMin: number, layerId = 'work'): TimelineEntry => ({ id, layerId, start: now + startMin * MINUTE, end: now + endMin * MINUTE });
const moment = (id: string, atMin: number, layerId = 'work'): TimelineEntry => ({ id, layerId, start: now + atMin * MINUTE, end: null });
const byId = (items: ReturnType<typeof layoutTimeline>) => Object.fromEntries(items.map((i) => [i.id, i]));

describe('layoutTimeline', () => {
  it('chooses card, compact, band and pill by length on screen', () => {
    const items = byId(layoutTimeline([
      task('hour', 0, 60),
      task('short', 0, 20),
      { id: 'goal', layerId: 'work', start: now - DAY, end: now + 2 * DAY },
      moment('note', 0),
    ], ['work'], view, AXIS));

    expect(items.hour).toMatchObject({ shape: 'card' });
    expect(items.hour.pos).toBeCloseTo(0.3);
    expect(items.hour.size).toBeCloseTo(0.1);
    expect(items.short.shape).toBe('compact');
    expect(items.goal).toMatchObject({ shape: 'band', size: 1 });
    expect(items.goal.pos).toBeCloseTo(0);
    expect(items.note.shape).toBe('pill');
    expect(items.note.pos).toBeCloseTo(0.3 - 15 / AXIS);
  });

  it('turns moments into dots when zoomed out to weeks', () => {
    const [item] = layoutTimeline([moment('note', 0)], ['work'], { ...view, span: 6 * WEEK }, AXIS);
    expect(item.shape).toBe('dot');
  });

  it('uses the given pill length', () => {
    const [item] = layoutTimeline([moment('note', 0)], ['work'], view, AXIS, { pillPx: 128 });
    expect(item.size).toBeCloseTo(128 / AXIS);
  });

  it('skips entries that are off screen or on hidden layers', () => {
    const items = layoutTimeline([task('tomorrow', 24 * 60, 25 * 60), task('hidden', 0, 60, 'life')], ['work'], view, AXIS);
    expect(items).toEqual([]);
  });

  it('also lays out a buffer of screens around the view', () => {
    const items = byId(layoutTimeline([
      task('later', 12 * 60, 13 * 60),
      { id: 'goal', layerId: 'work', start: now - 3 * DAY, end: now + 3 * DAY },
    ], ['work'], view, AXIS, { buffer: 1 }));
    expect(items.later.pos).toBeCloseTo(1.5);
    expect(items.goal).toMatchObject({ shape: 'band', pos: -1, size: 3 });
  });

  it('places overlapping items side by side, per lane', () => {
    const items = byId(layoutTimeline([
      task('a', 0, 60),
      task('b', 30, 90),
      task('c', 120, 180),
      task('d', 60, 120),
      task('other', 0, 60, 'study'),
    ], ['work', 'study'], view, AXIS));

    expect(items.a).toMatchObject({ column: 0, columns: 2 });
    expect(items.b).toMatchObject({ column: 1, columns: 2 });
    // d starts exactly when a ends, so it reuses a's column.
    expect(items.d).toMatchObject({ column: 0, columns: 2 });
    expect(items.c).toMatchObject({ column: 0, columns: 1 });
    expect(items.other).toMatchObject({ lane: 1, column: 0, columns: 1 });
  });

  it('mirrors positions for an upward timeline', () => {
    const [item] = layoutTimeline([task('hour', 0, 60)], ['work'], { ...view, direction: 'up' }, AXIS);
    expect(item.pos).toBeCloseTo(0.6);
    expect(item.size).toBeCloseTo(0.1);
  });
});

describe('laneAfterDrag', () => {
  it('switches after half a lane and stays on the board', () => {
    expect(laneAfterDrag(1, 40, 100, 4)).toBe(1);
    expect(laneAfterDrag(1, 60, 100, 4)).toBe(2);
    expect(laneAfterDrag(1, -160, 100, 4)).toBe(0);
    expect(laneAfterDrag(2, 900, 100, 4)).toBe(3);
    expect(laneAfterDrag(0, -900, 100, 4)).toBe(0);
  });
});
