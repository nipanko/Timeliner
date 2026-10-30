import { addUnit, floorUnit, HOUR } from './units';

// Tests run in America/New_York (jest.global-setup.js). In 2026 DST starts Mar 8 and ends Nov 1.
const local = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0, ms = 0) =>
  new Date(y, mo - 1, d, h, mi, s, ms).getTime();

describe('floorUnit', () => {
  it('floors to second, minute and hour slots', () => {
    expect(floorUnit(local(2026, 10, 30, 14, 37, 12, 345), 'second', 5)).toBe(local(2026, 10, 30, 14, 37, 10));
    expect(floorUnit(local(2026, 10, 30, 14, 37, 12), 'minute', 15)).toBe(local(2026, 10, 30, 14, 30));
    expect(floorUnit(local(2026, 10, 30, 14, 37), 'hour', 6)).toBe(local(2026, 10, 30, 12));
  });

  it('keeps the two 1 AM hours apart when DST ends', () => {
    const firstOneThirty = Date.UTC(2026, 10, 1, 5, 30); // 1:30 EDT
    const secondOneThirty = Date.UTC(2026, 10, 1, 6, 30); // 1:30 EST
    expect(floorUnit(firstOneThirty, 'hour')).toBe(Date.UTC(2026, 10, 1, 5, 0));
    expect(floorUnit(secondOneThirty, 'hour')).toBe(Date.UTC(2026, 10, 1, 6, 0));
  });

  it('finds the true start of a 6-hour slot that contains a DST change', () => {
    expect(floorUnit(local(2026, 11, 1, 5), 'hour', 6)).toBe(local(2026, 11, 1));
    expect(floorUnit(local(2026, 3, 8, 3, 30), 'hour', 6)).toBe(local(2026, 3, 8));
  });

  it('starts weeks on Monday by default, or Sunday', () => {
    expect(floorUnit(local(2026, 10, 30, 15), 'week')).toBe(local(2026, 10, 26));
    expect(floorUnit(local(2026, 11, 1, 10), 'week')).toBe(local(2026, 10, 26));
    expect(floorUnit(local(2026, 11, 1, 10), 'week', 1, 0)).toBe(local(2026, 11, 1));
    expect(floorUnit(local(2026, 10, 30, 15), 'week', 1, 0)).toBe(local(2026, 10, 25));
  });

  it('floors days, months, quarters and years', () => {
    expect(floorUnit(local(2026, 10, 30, 15), 'day')).toBe(local(2026, 10, 30));
    expect(floorUnit(local(2026, 10, 30, 15), 'month')).toBe(local(2026, 10, 1));
    expect(floorUnit(local(2026, 11, 15), 'month', 3)).toBe(local(2026, 10, 1));
    expect(floorUnit(local(2026, 2, 15), 'month', 3)).toBe(local(2026, 1, 1));
    expect(floorUnit(local(2026, 10, 30), 'year')).toBe(local(2026, 1, 1));
    expect(floorUnit(local(2026, 10, 30), 'year', 10)).toBe(local(2020, 1, 1));
  });
});

describe('addUnit', () => {
  it('adds real elapsed time for hours, skipping the missing DST hour', () => {
    expect(addUnit(local(2026, 3, 8, 1, 30), 'hour', 1)).toBe(local(2026, 3, 8, 3, 30));
  });

  it('keeps the wall-clock time for days and weeks across DST', () => {
    const next = addUnit(local(2026, 3, 7, 9), 'day', 1);
    expect(next).toBe(local(2026, 3, 8, 9));
    expect(next - local(2026, 3, 7, 9)).toBe(23 * HOUR);
    expect(addUnit(local(2026, 10, 26), 'week', 1)).toBe(local(2026, 11, 2));
  });

  it('clamps the day when a month or year is shorter', () => {
    expect(addUnit(local(2026, 1, 31), 'month', 1)).toBe(local(2026, 2, 28));
    expect(addUnit(local(2026, 3, 31, 9), 'month', -1)).toBe(local(2026, 2, 28, 9));
    expect(addUnit(local(2028, 2, 29), 'year', 1)).toBe(local(2029, 2, 28));
  });
});
