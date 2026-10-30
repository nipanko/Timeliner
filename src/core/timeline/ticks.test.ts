import { HOUR } from '../time/units';
import { getScale } from './scales';
import { hasLabel, labelEvery, tickLabel, ticks } from './ticks';

// America/New_York (jest.global-setup.js): DST starts Mar 8 and ends Nov 1, 2026.
const local = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();
const hours = (ts: number[]) => ts.map((t) => new Date(t).getHours());

describe('ticks', () => {
  it('lists aligned ticks inside the range', () => {
    expect(ticks(local(2026, 10, 30, 14, 7), local(2026, 10, 30, 15), { unit: 'minute', step: 15 })).toEqual([
      local(2026, 10, 30, 14, 15),
      local(2026, 10, 30, 14, 30),
      local(2026, 10, 30, 14, 45),
      local(2026, 10, 30, 15),
    ]);
  });

  it('keeps 6-hour ticks on 0/6/12/18 through both DST changes', () => {
    const autumn = ticks(local(2026, 10, 31), local(2026, 11, 2), { unit: 'hour', step: 6 });
    expect(hours(autumn)).toEqual([0, 6, 12, 18, 0, 6, 12, 18, 0]);
    const spring = ticks(local(2026, 3, 7), local(2026, 3, 9), { unit: 'hour', step: 6 });
    expect(hours(spring)).toEqual([0, 6, 12, 18, 0, 6, 12, 18, 0]);
  });

  it('shows 1 AM twice on the night DST ends', () => {
    expect(hours(ticks(local(2026, 11, 1), local(2026, 11, 1, 3), { unit: 'hour', step: 1 }))).toEqual([0, 1, 1, 2, 3]);
  });

  it('steps by calendar months and Monday weeks', () => {
    expect(ticks(local(2026, 1, 1), local(2027, 1, 1), { unit: 'month', step: 1 })).toHaveLength(13);
    expect(ticks(local(2026, 10, 28), local(2026, 11, 10), { unit: 'week', step: 1 })).toEqual([local(2026, 11, 2), local(2026, 11, 9)]);
  });

  it('stops at the cap', () => {
    expect(ticks(0, 1e12, { unit: 'second', step: 1 }, 1, 10)).toHaveLength(10);
  });
});

describe('label thinning', () => {
  const hourly = { unit: 'hour', step: 1 } as const;

  it('labels every tick when there is room, fewer on a short axis', () => {
    expect(labelEvery(hourly, 9 * HOUR, 500, 20)).toBe(1);
    expect(labelEvery(hourly, 9 * HOUR, 233, 90)).toBe(4);
  });

  it('keeps labels on round local times', () => {
    const labelled = ticks(local(2026, 10, 30), local(2026, 10, 30, 23), hourly).filter((t) => hasLabel(t, hourly, 4));
    expect(hours(labelled)).toEqual([0, 4, 8, 12, 16, 20]);
    const months = ticks(local(2026, 1, 1), local(2026, 12, 1), { unit: 'month', step: 1 }).filter((t) => hasLabel(t, { unit: 'month', step: 1 }, 3));
    expect(months.map((t) => new Date(t).getMonth())).toEqual([0, 3, 6, 9]);
  });
});

describe('tickLabel', () => {
  const t = local(2026, 10, 30, 15);
  it('formats for the zoom level and locale', () => {
    expect(tickLabel(t, getScale('hour'), 'en-US')).toBe('3 PM');
    expect(tickLabel(t, getScale('week'), 'en-US')).toBe('Oct 30');
    expect(tickLabel(t, getScale('day'), 'en-IN')).toBe('Fri 30');
    expect(tickLabel(t, getScale('year'), 'en-US')).toBe('2026');
  });

  it('adds the year to January at month zoom', () => {
    expect(tickLabel(local(2027, 1, 1), getScale('month'), 'en-US')).toBe('Jan 2027');
    expect(tickLabel(t, getScale('month'), 'en-US')).toBe('Oct');
  });
});
