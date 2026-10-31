import { MINUTE } from '../time/units';
import { expandEntries, formatRepeat, occurrenceId, occurrences, parseRepeat, repeatLabel } from './repeat';

// Tests run in America/New_York (jest.global-setup.js): DST ends Sun 1 Nov 2026.
const local = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();

describe('repeat rules', () => {
  it('parses, formats and labels', () => {
    expect(parseRepeat('daily')).toEqual({ kind: 'daily' });
    expect(parseRepeat('weekly:5,1,3,3')).toEqual({ kind: 'weekly', days: [1, 3, 5] });
    expect(parseRepeat('weekly:0,1,2,3,4,5,6')).toEqual({ kind: 'daily' });
    expect(parseRepeat('weekly:9')).toBeNull();
    expect(parseRepeat(null)).toBeNull();
    expect(formatRepeat({ kind: 'weekly', days: [5, 1] })).toBe('weekly:1,5');
    expect(repeatLabel({ kind: 'weekly', days: [1, 2, 3, 4, 5] })).toBe('Weekdays');
    expect(repeatLabel({ kind: 'weekly', days: [0, 6] })).toBe('Weekends');
    expect(repeatLabel({ kind: 'weekly', days: [0, 1, 5] })).toBe('Mon, Fri, Sun');
  });
});

describe('occurrences', () => {
  const gym = local(2026, 10, 26, 7, 0); // Monday 26 Oct, 7:00 AM

  it('lands on the chosen weekdays at the same time, from the first one on', () => {
    const got = occurrences(gym, 60 * MINUTE, { kind: 'weekly', days: [1, 3, 5] }, local(2026, 10, 20), local(2026, 11, 7));
    expect(got).toEqual([local(2026, 10, 26, 7), local(2026, 10, 28, 7), local(2026, 10, 30, 7), local(2026, 11, 2, 7), local(2026, 11, 4, 7), local(2026, 11, 6, 7)]);
  });

  it('keeps the wall-clock time across the DST change', () => {
    const got = occurrences(local(2026, 10, 31, 9), 0, { kind: 'daily' }, local(2026, 10, 31), local(2026, 11, 3));
    expect(got.map((t) => new Date(t).getHours())).toEqual([9, 9, 9]);
  });

  it('includes an occurrence already running when the window starts', () => {
    const got = occurrences(local(2026, 11, 2, 23), 120 * MINUTE, { kind: 'daily' }, local(2026, 11, 3, 0, 30), local(2026, 11, 3, 6));
    expect(got).toEqual([local(2026, 11, 2, 23)]);
  });
});

describe('expandEntries', () => {
  it('turns a series into dated occurrences, each with its own done state', () => {
    const series = { id: 's', start: local(2026, 11, 2, 7), end: local(2026, 11, 2, 8), done: false, repeat: 'daily', title: 'Run' };
    const single = { id: 'x', start: local(2026, 11, 3, 12), end: null, done: true, repeat: null, title: 'Lunch' };
    const tue = local(2026, 11, 3, 7);
    const out = expandEntries([series, single], new Set([occurrenceId('s', tue)]), local(2026, 11, 2), local(2026, 11, 4));
    expect(out.map((e) => [e.id, e.done, e.seriesId])).toEqual([
      [occurrenceId('s', local(2026, 11, 2, 7)), false, 's'],
      [occurrenceId('s', tue), true, 's'],
      ['x', true, undefined],
    ]);
    expect(out[1]).toMatchObject({ start: tue, end: tue + 60 * MINUTE, title: 'Run' });
  });
});
