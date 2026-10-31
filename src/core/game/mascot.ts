export type Mood = 'happy' | 'proud' | 'sleepy' | 'focused' | 'cheer';

/**
 * How Tick looks. Never sad or disappointed: a missed day just gets the friendly default
 * (RESEARCH.md #10, no guilt). `cheer` is the short moment after a gain, set by the UI.
 */
export function mascotMood(p: { hour: number; doneToday: number; focusing?: boolean }): Mood {
  if (p.focusing) return 'focused';
  if (p.hour >= 23 || p.hour < 6) return 'sleepy';
  if (p.doneToday >= 3) return 'proud';
  return 'happy';
}
