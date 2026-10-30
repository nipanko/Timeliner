import { periodProgress, periodRange } from './periods';

const local = (y: number, mo: number, d: number, h = 0) => new Date(y, mo - 1, d, h).getTime();

describe('periods', () => {
  it('finds the week around a day, Monday to Monday', () => {
    expect(periodRange(local(2026, 10, 30, 15), 'week')).toEqual({ start: local(2026, 10, 26), end: local(2026, 11, 2) });
  });

  it('measures progress through day, month and year', () => {
    expect(periodProgress(local(2026, 10, 30, 12), 'day')).toBe(0.5);
    expect(periodProgress(local(2026, 10, 16), 'month')).toBeCloseTo(15 / 31);
    expect(periodRange(local(2026, 10, 30), 'year')).toEqual({ start: local(2026, 1, 1), end: local(2027, 1, 1) });
  });

  it('uses real hours on the 23-hour day when DST starts', () => {
    expect(periodProgress(local(2026, 3, 8, 12), 'day')).toBeCloseTo(11 / 23);
  });
});
