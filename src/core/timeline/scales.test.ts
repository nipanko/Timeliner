import { HOUR } from '../time/units';
import { getScale, scaleForSpan, SCALES, zoomAfterPinch } from './scales';

describe('zoom ladder', () => {
  it('runs from seconds to years with growing spans', () => {
    expect(SCALES.map((s) => s.id)).toEqual(['sec', 'min', 'hour', 'day', 'week', 'month', 'year']);
    SCALES.slice(1).forEach((s, i) => expect(s.span).toBeGreaterThan(SCALES[i].span));
    expect(getScale('hour').span).toBe(9 * HOUR);
  });

  it('picks the finest rung whose labels stay readable while pinching', () => {
    expect(scaleForSpan(40_000, 600).id).toBe('sec');
    expect(scaleForSpan(9 * HOUR, 600).id).toBe('hour');
    expect(scaleForSpan(48 * HOUR, 600).id).toBe('day');
    expect(scaleForSpan(30 * 365 * 24 * HOUR, 600).id).toBe('year');
  });
});

describe('zoomAfterPinch', () => {
  it('spreading zooms in, pinching zooms out', () => {
    expect(zoomAfterPinch('hour', 1.8)).toBe('min');
    expect(zoomAfterPinch('hour', 0.55)).toBe('day');
    expect(zoomAfterPinch('hour', 3.2)).toBe('sec');
  });
  it('ignores a small wobble and stays on the ladder', () => {
    expect(zoomAfterPinch('hour', 1.3)).toBe('hour');
    expect(zoomAfterPinch('hour', 0.8)).toBe('hour');
    expect(zoomAfterPinch('sec', 5)).toBe('sec');
    expect(zoomAfterPinch('year', 0.1)).toBe('year');
    expect(zoomAfterPinch('day', 0)).toBe('day');
  });
});
