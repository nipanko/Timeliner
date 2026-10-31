import { mascotMood } from './mascot';

describe('mascotMood', () => {
  it('is focused in focus mode, sleepy late at night, proud after three wins', () => {
    expect(mascotMood({ hour: 23, doneToday: 5, focusing: true })).toBe('focused');
    expect(mascotMood({ hour: 2, doneToday: 5 })).toBe('sleepy');
    expect(mascotMood({ hour: 14, doneToday: 3 })).toBe('proud');
  });
  it('stays friendly when nothing is done yet', () => {
    expect(mascotMood({ hour: 9, doneToday: 0 })).toBe('happy');
    expect(mascotMood({ hour: 22, doneToday: 2 })).toBe('happy');
  });
});
