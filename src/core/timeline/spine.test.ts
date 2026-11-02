import { MINUTE } from '../time/units';
import { bucketize, snapTo, spineSides, stackCards } from './spine';

// America/New_York (jest.global-setup.js): DST ends Sun 1 Nov 2026.
const local = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();

describe('spineSides', () => {
  it('alternates within each day, first card on the right', () => {
    const sides = spineSides([
      { id: 'b', start: local(2026, 11, 2, 10) },
      { id: 'a', start: local(2026, 11, 2, 8) },
      { id: 'c', start: local(2026, 11, 2, 12) },
      { id: 'next-day', start: local(2026, 11, 3, 9) },
    ]);
    expect([sides.get('a'), sides.get('b'), sides.get('c'), sides.get('next-day')]).toEqual([1, -1, 1, 1]);
  });

  it("depends only on the card's own day, so scrolling never flips it", () => {
    const monday = [{ id: 'm1', start: local(2026, 11, 2, 9) }, { id: 'm2', start: local(2026, 11, 2, 11) }];
    const withSunday = spineSides([{ id: 's', start: local(2026, 11, 1, 22) }, ...monday]);
    expect(withSunday.get('m2')).toBe(spineSides(monday).get('m2'));
  });
});

describe('stackCards', () => {
  it('centres cards on their time and slides crowded ones along, per side', () => {
    const tops = stackCards(
      [
        { id: 'a', at: 100, side: 1 },
        { id: 'b', at: 110, side: 1 },
        { id: 'c', at: 105, side: -1 },
      ],
      50,
      10,
    );
    expect(tops.get('a')).toBe(75);
    expect(tops.get('b')).toBe(135); // pushed below a: 75 + 50 + 10
    expect(tops.get('c')).toBe(80); // the other side is free
  });
});

describe('snapTo', () => {
  const five = { unit: 'minute', step: 5 } as const;
  it('rounds to the nearest slot, or up when live', () => {
    expect(snapTo(local(2026, 11, 2, 9, 2), five, 'round')).toBe(local(2026, 11, 2, 9, 0));
    expect(snapTo(local(2026, 11, 2, 9, 3), five, 'round')).toBe(local(2026, 11, 2, 9, 5));
    expect(snapTo(local(2026, 11, 2, 9, 1), five, 'ceil')).toBe(local(2026, 11, 2, 9, 5));
    expect(snapTo(local(2026, 11, 2, 9, 5), five, 'ceil')).toBe(local(2026, 11, 2, 9, 5));
  });

  it('snaps days to local midnight across the DST change', () => {
    expect(snapTo(local(2026, 11, 1, 20), { unit: 'day', step: 1 }, 'round')).toBe(local(2026, 11, 2));
  });
});

describe('bucketize', () => {
  it('counts entries per day with the most common layer, sides alternating by date', () => {
    const at = (d: number, h: number) => local(2026, 11, d, h);
    const buckets = bucketize(
      [
        { start: at(2, 9), layerId: 'work' },
        { start: at(2, 18), layerId: 'life' },
        { start: at(2, 20), layerId: 'life' },
        { start: at(3, 9), layerId: 'work' },
        { start: at(9, 9), layerId: 'work' }, // outside the range
      ],
      { unit: 'day', step: 1 },
      local(2026, 11, 1),
      local(2026, 11, 8),
    );
    expect(buckets.map((b) => [b.start, b.count, b.layerId, b.first])).toEqual([
      [local(2026, 11, 2), 3, 'life', at(2, 9)],
      [local(2026, 11, 3), 1, 'work', at(3, 9)],
    ]);
    expect(buckets[0].side).toBe(-buckets[1].side);
    expect(buckets[0].end - buckets[0].start).toBe(24 * 60 * MINUTE);
  });
});
