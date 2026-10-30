import { addUnit, floorUnit } from '../time/units';

const FREEZE_EVERY = 7;
const MAX_FREEZES = 2;

/**
 * Forgiving streak (RESEARCH.md #9–10): a day counts when a task or todo planned for it is done.
 * Every 7 streak days earn a freeze (max 2); a missed day uses one instead of resetting.
 * Today never breaks the streak: it is still in progress.
 */
export function streak(doneDays: readonly number[], now: number) {
  const days = new Set(doneDays.map((t) => floorUnit(t, 'day')));
  const today = floorUnit(now, 'day');
  let count = 0;
  let freezes = 0;
  let best = 0;
  let comebacks = 0; // days the streak restarted after breaking (RESEARCH.md #10)
  let broken = false;
  if (!days.size) return { days: 0, freezes: 0, best: 0, comebacks: 0 };
  for (let d = Math.min(...days); d <= today; d = addUnit(d, 'day', 1)) {
    if (days.has(d)) {
      count += 1;
      best = Math.max(best, count);
      if (broken) {
        comebacks += 1;
        broken = false;
      }
      if (count % FREEZE_EVERY === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
    } else if (d === today) {
      break;
    } else if (freezes > 0) {
      freezes -= 1;
    } else {
      broken ||= count > 0;
      count = 0;
    }
  }
  return { days: count, freezes, best, comebacks };
}
