import { HOUR } from '../time/units';
import { MIN_SPAN, panBy, posToTime, timeToPos, visibleRange, zoomAround, type Viewport } from './viewport';

const now = Date.UTC(2026, 9, 30, 9, 0);
const view = (direction: Viewport['direction']): Viewport => ({ anchorTime: now, anchorFrac: 0.3, span: 10 * HOUR, direction });

describe('viewport', () => {
  it('puts now at the anchor and the future toward the far edge', () => {
    const down = view('down');
    expect(timeToPos(now, down)).toBeCloseTo(0.3);
    expect(timeToPos(now + 5 * HOUR, down)).toBeCloseTo(0.8);
    expect(visibleRange(down)).toEqual({ start: now - 3 * HOUR, end: now + 7 * HOUR });
  });

  it('mirrors the axis for up and left', () => {
    expect(timeToPos(now + 5 * HOUR, view('up'))).toBeCloseTo(0.2);
    expect(timeToPos(now + 5 * HOUR, view('left'))).toBeCloseTo(0.2);
    expect(timeToPos(now + 5 * HOUR, view('right'))).toBeCloseTo(0.8);
  });

  it('converts positions back to times in every direction', () => {
    for (const d of ['down', 'up', 'right', 'left'] as const) {
      expect(posToTime(timeToPos(now + 2 * HOUR, view(d)), view(d))).toBeCloseTo(now + 2 * HOUR);
    }
  });

  it('moves content with the finger when dragging', () => {
    // Finger moves down 10% on a downward timeline: earlier times come into view.
    expect(panBy(view('down'), 0.1).anchorTime).toBe(now - HOUR);
    // Same move on an upward timeline shows later times.
    expect(panBy(view('up'), 0.1).anchorTime).toBe(now + HOUR);
  });

  it('zooms around the pinch point and clamps the span', () => {
    const v = view('down');
    const focus = 0.8;
    const zoomed = zoomAround(v, 0.5, focus);
    expect(zoomed.span).toBe(5 * HOUR);
    expect(posToTime(focus, zoomed)).toBeCloseTo(posToTime(focus, v));
    expect(zoomAround(v, 1e-9, focus).span).toBe(MIN_SPAN);
    // Zooming around the now-line keeps following the clock.
    expect(zoomAround(v, 2, 0.3).anchorTime).toBeCloseTo(now);
  });
});
