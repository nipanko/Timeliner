import { tickLine, type VoiceContext } from './voice';

const base: VoiceContext = { hour: 9, planned: 0, doneToday: 0, dayClosed: false, streakDays: 0, hadStreak: false };

describe('tickLine', () => {
  it('asks for the top 3 on an empty morning', () => {
    expect(tickLine(base)).toMatchObject({ key: 'morning', action: 'plan' });
  });

  it('meets a broken streak with curiosity, not blame', () => {
    const line = tickLine({ ...base, hadStreak: true });
    expect(line).toMatchObject({ key: 'comeback', action: 'plan' });
    expect(line.text).not.toMatch(/lost|broke|fail/i);
  });

  it('points at the next task, then celebrates the start', () => {
    expect(tickLine({ ...base, planned: 3, next: 'Write intro' })).toMatchObject({ action: 'focus', text: expect.stringContaining('First up: Write intro') });
    expect(tickLine({ ...base, planned: 3, doneToday: 1, next: 'Gym' }).text).toContain('That’s the hard part');
  });

  it('offers the evening close with the best moment', () => {
    expect(tickLine({ ...base, hour: 20, planned: 3, doneToday: 2, best: 'Deep work' })).toMatchObject({ key: 'evening', action: 'review', text: expect.stringContaining('Deep work') });
  });

  it('goes quiet once the day is closed, and sleepy at night', () => {
    expect(tickLine({ ...base, hour: 21, planned: 2, doneToday: 2, dayClosed: true })).toMatchObject({ key: 'closed', action: null });
    expect(tickLine({ ...base, hour: 1 })).toMatchObject({ key: 'night', action: null });
    expect(tickLine({ ...base, hour: 23, planned: 1, doneToday: 1 })).toMatchObject({ key: 'night-close', action: 'review' });
  });
});
