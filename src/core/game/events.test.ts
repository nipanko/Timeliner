import { progressEvents } from './events';

describe('progressEvents', () => {
  const before = { xp: 90, level: 1, badges: ['streak-3'] };

  it('reports XP gained, a level up and new badges', () => {
    expect(progressEvents(before, { xp: 115, level: 2, badges: ['streak-3', 'early'] })).toEqual([
      { type: 'xp', amount: 25 },
      { type: 'level', level: 2 },
      { type: 'badge', id: 'early' },
    ]);
  });

  it('stays silent on undo or no change', () => {
    expect(progressEvents(before, { xp: 70, level: 1, badges: [] })).toEqual([]);
    expect(progressEvents(before, before)).toEqual([]);
  });
});
