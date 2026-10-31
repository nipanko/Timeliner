import { monthGrid, periodProgress, periodRange } from './periods';

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

describe('monthGrid', () => {
  it('starts on the week start before the 1st and covers 6 weeks, across the DST change', () => {
    const grid = monthGrid(local(2026, 11, 15), 1); // November 2026: the 1st is a Sunday, DST ends that day
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe(local(2026, 10, 26));
    expect(grid[6]).toBe(local(2026, 11, 1));
    expect(grid[7]).toBe(local(2026, 11, 2));
    expect(grid[41]).toBe(local(2026, 12, 6));
  });
  it('honours a Sunday week start', () => {
    expect(monthGrid(local(2026, 11, 15), 0)[0]).toBe(local(2026, 11, 1));
  });
});
