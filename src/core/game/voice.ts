/** What Tick's bubble offers to do next. */
export type TickAction = 'plan' | 'focus' | 'review' | null;
export type TickLine = { key: string; text: string; action: TickAction };

export type VoiceContext = {
  hour: number;
  /** Tasks and todos on today's line. */
  planned: number;
  doneToday: number;
  /** Title of the next open task today, if any. */
  next?: string;
  /** Title of today's best finished piece of work (Review's peak-end pick). */
  best?: string;
  dayClosed: boolean;
  streakDays: number;
  /** Ever had a streak: a zero streak then means a comeback, not a first day. */
  hadStreak: boolean;
};

/**
 * Tick's one line for the Timeline (STRATEGY.md §2). Warm, short, never guilt: a miss gets curiosity,
 * effort gets celebrated. `key` names the situation so a dismissed bubble stays hidden until it changes.
 */
export function tickLine(c: VoiceContext): TickLine {
  const evening = c.hour >= 18;
  const night = c.hour >= 23 || c.hour < 6;

  if (c.dayClosed) return { key: 'closed', text: night ? 'Day closed. Sleep well, I’ll guard the line.' : 'Day closed. Anything else is a bonus.', action: null };
  if (night) {
    return c.doneToday > 0
      ? { key: 'night-close', text: 'Past my bedtime. Close the day before you go?', action: 'review' }
      : { key: 'night', text: 'Past my bedtime. Tomorrow’s line will still be here.', action: null };
  }
  if (c.planned === 0) {
    if (c.hadStreak && c.streakDays === 0) return { key: 'comeback', text: 'Yesterday got away from us. Want a 5-minute win to restart?', action: 'plan' };
    if (c.hour < 12) return { key: 'morning', text: 'Let’s draw today’s line. What are your top 3?', action: 'plan' };
    return { key: 'blank', text: 'A blank afternoon? Even one small thing counts.', action: 'plan' };
  }
  if (evening && c.doneToday > 0) {
    return { key: 'evening', text: c.best ? `Best moment today: ${c.best}. Close the day?` : 'Good day on the line. Close it?', action: 'review' };
  }
  if (c.doneToday >= c.planned) return { key: 'all-done', text: 'Everything on the line is done. Show-off.', action: evening ? 'review' : 'plan' };
  if (c.next) {
    return c.doneToday > 0
      ? { key: `next-${c.next}`, text: `You started. That’s the hard part. Next: ${c.next}.`, action: 'focus' }
      : { key: `next-${c.next}`, text: `First up: ${c.next}. One tap and I’ll keep time.`, action: 'focus' };
  }
  return { key: 'steady', text: c.doneToday > 0 ? 'You started. That’s the hard part.' : 'Your line is drawn. Tap a node when it’s done.', action: null };
}
