import { HOUR } from '../time/units';
import { getScale, scaleForSpan, SCALES } from './scales';

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
